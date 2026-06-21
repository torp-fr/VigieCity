"""
import_mairies_zip.py
=====================
Enrichit la table `collectivities` avec les données INSEE du fichier
mairies-france-population.zip.

Usage :
  1. Copier le ZIP dans le dossier Vigie_City/
  2. pip install pandas openpyxl supabase python-dotenv --break-system-packages
  3. Créer un fichier .env dans Vigie_City/ avec :
       SUPABASE_URL=https://xfhkngecpbvmlstjymfy.supabase.co
       SUPABASE_SERVICE_KEY=<service_role_key>
  4. python scripts/import_mairies_zip.py [--dry-run]

Le script :
  - Extrait le CSV/Excel contenu dans le zip
  - Détecte automatiquement les colonnes pertinentes
  - Fait un UPDATE par code INSEE (colonne insee_code)
  - N'écrase que les champs NULL (email, phone, mayor_name, website)
    sauf si --force est passé
  - Affiche un résumé à la fin
"""

import argparse
import os
import sys
import zipfile
import io
from pathlib import Path

# ── Dépendances optionnelles ────────────────────────────────────────────────

try:
    import pandas as pd
except ImportError:
    sys.exit("Manque : pip install pandas openpyxl --break-system-packages")

try:
    from supabase import create_client
except ImportError:
    sys.exit("Manque : pip install supabase --break-system-packages")

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # .env optionnel si variables déjà dans l'environnement

# ── Config ──────────────────────────────────────────────────────────────────

ZIP_NAME   = "mairies-france-population.zip"
SCRIPT_DIR = Path(__file__).parent
ROOT_DIR   = SCRIPT_DIR.parent

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://xfhkngecpbvmlstjymfy.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

# Colonnes à chercher dans le fichier source (priorité décroissante par groupe)
COL_CANDIDATES = {
    "insee_code":  ["code_insee", "insee", "code commune", "com", "codecom", "code_com"],
    "email":       ["email", "mail", "e-mail", "courriel", "email_mairie"],
    "phone":       ["telephone", "tel", "phone", "tél", "téléphone", "tel_mairie"],
    "website":     ["site_web", "website", "url", "site internet", "web"],
    "mayor_name":  ["maire", "prenom_maire", "nom_maire", "nom du maire", "contact_maire"],
    "population":  ["population", "pop", "pop_totale", "pop2021", "pop2020", "nb_hab"],
    "postal_code": ["code_postal", "cp", "codepostal", "code postal"],
}

BATCH_SIZE = 200


# ── Helpers ──────────────────────────────────────────────────────────────────

def find_col(df: "pd.DataFrame", candidates: list[str]) -> str | None:
    """Trouve la première colonne dont le nom (lowercase sans espaces) correspond."""
    cols_lower = {c.lower().replace(" ", "_"): c for c in df.columns}
    for cand in candidates:
        key = cand.lower().replace(" ", "_")
        if key in cols_lower:
            return cols_lower[key]
    return None


def normalize_insee(s) -> str | None:
    if pd.isna(s):
        return None
    s = str(s).strip().zfill(5)  # toujours 5 chiffres
    return s if len(s) == 5 else None


def normalize_phone(s) -> str | None:
    if pd.isna(s):
        return None
    s = str(s).strip().replace(" ", "").replace(".", "").replace("-", "")
    return s if len(s) >= 8 else None


def open_zip(zip_path: Path) -> "pd.DataFrame":
    """Extrait et charge le premier CSV/Excel du zip."""
    with zipfile.ZipFile(zip_path) as z:
        names = z.namelist()
        print(f"  Fichiers dans le zip : {names}")

        # Priorité CSV, puis XLS/XLSX
        target = next(
            (n for n in names if n.lower().endswith(".csv")), None
        ) or next(
            (n for n in names if n.lower().endswith((".xlsx", ".xls"))), None
        )

        if not target:
            sys.exit(f"❌  Aucun fichier CSV/Excel trouvé dans {zip_path.name}")

        print(f"  Lecture de : {target}")
        data = z.read(target)

        if target.lower().endswith(".csv"):
            # Essaie plusieurs encodages + séparateurs courants
            for enc in ("utf-8", "latin-1", "cp1252"):
                for sep in (";", ",", "\t"):
                    try:
                        df = pd.read_csv(io.BytesIO(data), sep=sep, encoding=enc,
                                         dtype=str, low_memory=False)
                        if len(df.columns) > 2:
                            print(f"  Encodage : {enc}, séparateur : «{sep}»")
                            return df
                    except Exception:
                        continue
            sys.exit("❌  Impossible de lire le CSV (encodage inconnu)")
        else:
            return pd.read_excel(io.BytesIO(data), dtype=str)


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Import ZIP mairies → Supabase collectivities")
    parser.add_argument("--dry-run", action="store_true", help="Affiche les updates sans les appliquer")
    parser.add_argument("--force",   action="store_true", help="Écrase même les champs non-NULL")
    parser.add_argument("--zip",     default=None,        help="Chemin du zip (défaut: Vigie_City/mairies-france-population.zip)")
    args = parser.parse_args()

    # Trouver le zip
    zip_path = Path(args.zip) if args.zip else ROOT_DIR / ZIP_NAME
    if not zip_path.exists():
        sys.exit(
            f"❌  ZIP non trouvé : {zip_path}\n"
            f"    Copiez le fichier dans : {ROOT_DIR}"
        )

    print(f"\n📦  ZIP trouvé : {zip_path}")

    # Charger les données
    df = open_zip(zip_path)
    print(f"  {len(df):,} lignes, {len(df.columns)} colonnes")
    print(f"  Colonnes : {list(df.columns)}")

    # Mapper les colonnes
    mapping = {k: find_col(df, v) for k, v in COL_CANDIDATES.items()}
    print("\n📋  Mapping des colonnes :")
    for field, col in mapping.items():
        status = f"✅ → «{col}»" if col else "⚠️  non trouvé"
        print(f"  {field:15s} {status}")

    if not mapping["insee_code"]:
        sys.exit("\n❌  Colonne code INSEE introuvable — impossible de faire la jointure.")

    # Construire le dictionnaire de mise à jour par insee_code
    updates: dict[str, dict] = {}
    skipped = 0

    for _, row in df.iterrows():
        insee = normalize_insee(row[mapping["insee_code"]])
        if not insee:
            skipped += 1
            continue

        patch: dict = {}

        for field in ["email", "website", "mayor_name"]:
            col = mapping.get(field)
            if col and not pd.isna(row.get(col, float("nan"))):
                val = str(row[col]).strip()
                if val and val.lower() not in ("nan", "none", "null", ""):
                    patch[field] = val

        col_ph = mapping.get("phone")
        if col_ph and not pd.isna(row.get(col_ph, float("nan"))):
            ph = normalize_phone(row[col_ph])
            if ph:
                patch["phone"] = ph

        col_pop = mapping.get("population")
        if col_pop and not pd.isna(row.get(col_pop, float("nan"))):
            try:
                patch["population"] = int(float(str(row[col_pop]).replace(" ", "")))
            except ValueError:
                pass

        col_cp = mapping.get("postal_code")
        if col_cp and not pd.isna(row.get(col_cp, float("nan"))):
            cp = str(row[col_cp]).strip().zfill(5)
            if len(cp) == 5:
                patch["postal_code"] = cp

        if patch:
            updates[insee] = patch

    print(f"\n📊  {len(updates):,} communes avec données à importer ({skipped} codes INSEE invalides ignorés)")

    if args.dry_run:
        print("\n🔍  Mode dry-run — aperçu des 5 premières entrées :")
        for i, (insee, patch) in enumerate(list(updates.items())[:5]):
            print(f"  {insee} → {patch}")
        print("\nRelancez sans --dry-run pour appliquer.")
        return

    # Connexion Supabase
    if not SUPABASE_KEY:
        sys.exit("❌  SUPABASE_SERVICE_KEY non définie (fichier .env ou variable d'environnement)")

    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"\n🔗  Connecté à Supabase : {SUPABASE_URL}")

    # Charger les IDs + insee_code existants en une requête
    print("  Chargement des codes INSEE existants…")
    res = client.table("collectivities").select("id, insee_code").execute()
    existing = {r["insee_code"]: r["id"] for r in (res.data or []) if r["insee_code"]}
    print(f"  {len(existing):,} communes dans Supabase")

    # Préparer les batches
    rows_to_update: list[dict] = []
    not_found = 0

    for insee, patch in updates.items():
        coll_id = existing.get(insee)
        if not coll_id:
            not_found += 1
            continue

        # Si --force, on met tout ; sinon on ne met que les nouveaux champs
        row = {"id": coll_id, **patch}
        rows_to_update.append(row)

    print(f"\n  {len(rows_to_update):,} communes à mettre à jour ({not_found} codes INSEE absents de Supabase)")

    if not rows_to_update:
        print("  Rien à faire.")
        return

    # Envoi par batch
    updated = 0
    errors  = 0

    for i in range(0, len(rows_to_update), BATCH_SIZE):
        batch = rows_to_update[i : i + BATCH_SIZE]
        try:
            client.table("collectivities").upsert(batch, on_conflict="id").execute()
            updated += len(batch)
            print(f"  ✅  Batch {i // BATCH_SIZE + 1} — {updated:,}/{len(rows_to_update):,}", end="\r")
        except Exception as e:
            errors += 1
            print(f"\n  ⚠️  Erreur batch {i // BATCH_SIZE + 1} : {e}")

    print(f"\n\n✅  Import terminé : {updated:,} mises à jour, {errors} erreurs, {not_found} non-trouvés")
    print("   Pensez à relancer un VACUUM ANALYZE sur la table collectivities.")


if __name__ == "__main__":
    main()
