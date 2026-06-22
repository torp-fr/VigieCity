#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import argparse, os, sys, zipfile, io, uuid
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    sys.exit("pip install pandas openpyxl --break-system-packages")

try:
    from supabase import create_client
except ImportError:
    sys.exit("pip install supabase --break-system-packages")

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

ZIP_NAME = "mairies-france-population.zip"
SCRIPT_DIR = Path(__file__).parent
ROOT_DIR = SCRIPT_DIR.parent
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://xfhkngecpbvmlstjymfy.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
BATCH_SIZE = 200

COL_CANDIDATES = {
    "insee_code":  ["code_insee", "insee", "code commune", "com", "codecom", "code_com", "code insee"],
    "email":       ["email", "mail", "e-mail", "courriel", "email_mairie", "adresse e-mail"],
    "phone":       ["telephone", "tel", "phone", "tel", "telephone", "tel_mairie", "numero de telephone", "numero de telephone"],
    "website":     ["site_web", "website", "url", "site internet", "web", "adresse du site internet"],
    "mayor_name":  ["maire", "prenom_maire", "nom_maire", "nom du maire", "contact_maire"],
    "population":  ["population", "pop", "pop_totale", "pop2021", "pop2020", "nb_hab"],
    "postal_code": ["code_postal", "cp", "codepostal", "code postal"],
    "name":        ["nom", "name", "mairie"],
    "department_code": ["departement", "code_departement", "dep", "dept", "code dept"],
    "region":      ["region"],
    "latitude":    ["latitude", "lat"],
    "longitude":   ["longitude", "lon", "long"],
}

def normalize_str(s):
    import unicodedata
    nfd = unicodedata.normalize('NFD', s)
    base = ''.join(c for c in nfd if unicodedata.category(c) != 'Mn')
    return base.lower().replace(" ", "_")

def find_col(df, candidates):
    cols_norm = {normalize_str(c): c for c in df.columns}
    for cand in candidates:
        key = normalize_str(cand)
        if key in cols_norm:
            return cols_norm[key]
    return None

def normalize_insee(s):
    if pd.isna(s): return None
    s = str(s).strip().zfill(5)
    return s if len(s) == 5 else None

def normalize_phone(s):
    if pd.isna(s): return None
    s = str(s).strip().replace(" ", "").replace(".", "").replace("-", "")
    return s if len(s) >= 8 else None

def open_zip(zip_path):
    with zipfile.ZipFile(zip_path) as z:
        names = z.namelist()
        target = next((n for n in names if n.lower().endswith(".csv")), None) or next((n for n in names if n.lower().endswith((".xlsx", ".xls"))), None)
        if not target:
            sys.exit("Aucun CSV/Excel trouve")
        data = z.read(target)
        if target.lower().endswith(".csv"):
            for enc in ("utf-8", "latin-1", "cp1252"):
                for sep in (";", ",", "\t"):
                    try:
                        df = pd.read_csv(io.BytesIO(data), sep=sep, encoding=enc, dtype=str, low_memory=False)
                        if len(df.columns) > 2:
                            print("  Encodage: {}, separateur: '{}'".format(enc, sep))
                            return df
                    except: pass
            sys.exit("Impossible de lire le CSV")
        else:
            return pd.read_excel(io.BytesIO(data), dtype=str)

def main():
    parser = argparse.ArgumentParser(description="Import ZIP mairies -> Supabase (UPDATE + INSERT)")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--zip", default=None)
    args = parser.parse_args()

    zip_path = Path(args.zip) if args.zip else ROOT_DIR / ZIP_NAME
    if not zip_path.exists():
        sys.exit("ZIP non trouve: {}".format(zip_path))

    print("\n[*] ZIP trouve: {}".format(zip_path))
    df = open_zip(zip_path)
    print("  {:,} lignes, {} colonnes".format(len(df), len(df.columns)))

    mapping = {k: find_col(df, v) for k, v in COL_CANDIDATES.items()}
    print("\n[*] Mapping:")
    for field, col in mapping.items():
        print("  {:15s} {}".format(field, "OK -> '{}'".format(col) if col else "NOT FOUND"))

    if not mapping["insee_code"]:
        sys.exit("Code INSEE introuvable")

    all_patches = {}
    skipped = 0

    for _, row in df.iterrows():
        insee = normalize_insee(row[mapping["insee_code"]])
        if not insee:
            skipped += 1
            continue

        patch = {"insee_code": insee}

        for field in ["email", "website", "mayor_name", "department_code", "region"]:
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
            except: pass

        col_cp = mapping.get("postal_code")
        if col_cp and not pd.isna(row.get(col_cp, float("nan"))):
            cp = str(row[col_cp]).strip().zfill(5)
            if len(cp) == 5:
                patch["postal_code"] = cp

        col_nom = mapping.get("name")
        if col_nom and not pd.isna(row.get(col_nom, float("nan"))):
            nom = str(row[col_nom]).strip()
            if nom:
                patch["name"] = nom

        col_lat = mapping.get("latitude")
        if col_lat and not pd.isna(row.get(col_lat, float("nan"))):
            try:
                patch["latitude"] = float(row[col_lat])
            except: pass

        col_lon = mapping.get("longitude")
        if col_lon and not pd.isna(row.get(col_lon, float("nan"))):
            try:
                patch["longitude"] = float(row[col_lon])
            except: pass

        if patch:
            all_patches[insee] = patch

    print("\n[*] {:,} communes a importer ({} codes INSEE invalides)".format(len(all_patches), skipped))

    if args.dry_run:
        print("\n[DRY-RUN] Apercu 5 premieres:")
        for insee, patch in list(all_patches.items())[:5]:
            print("  {} -> {}".format(insee, patch))
        return

    if not SUPABASE_KEY:
        sys.exit("SUPABASE_SERVICE_KEY non definie")

    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("\n[*] Connecte a Supabase")

    # PostgREST plafonne a 1000 lignes par requete -> on pagine pour tout charger.
    existing = {}
    page = 0
    while True:
        res = (client.table("collectivities")
               .select("id, insee_code")
               .range(page * 1000, page * 1000 + 999)
               .execute())
        rows = res.data or []
        for r in rows:
            if r["insee_code"]:
                existing[r["insee_code"]] = r["id"]
        if len(rows) < 1000:
            break
        page += 1
    print("  {:,} communes existantes".format(len(existing)))

    to_update = []
    to_insert = []

    for insee, patch in all_patches.items():
        coll_id = existing.get(insee)
        if coll_id:
            row = {"id": coll_id}
            row.update({k: v for k, v in patch.items() if k != "insee_code"})
            to_update.append(row)
        else:
            row = {"id": str(uuid.uuid4())}
            row.update(patch)
            to_insert.append(row)

    print("  {:,} a UPDATE".format(len(to_update)))
    print("  {:,} a INSERT".format(len(to_insert)))

    if to_update:
        print("\n[*] Phase 1: UPDATE...")
        updated = 0
        for idx, row in enumerate(to_update, 1):
            coll_id = row.pop("id")
            try:
                client.table("collectivities").update(row).eq("id", coll_id).execute()
                updated += 1
                if idx % 50 == 0 or idx == len(to_update):
                    print("  [{:,}/{:,}]".format(updated, len(to_update)), end="\r")
            except Exception as e:
                print("\n  ERROR: {}".format(e))
        print("\n  UPDATE: {:,} OK".format(updated))

    if to_insert:
        print("\n[*] Phase 2: INSERT (batch {})...".format(BATCH_SIZE))
        inserted = 0
        for i in range(0, len(to_insert), BATCH_SIZE):
            batch = to_insert[i : i + BATCH_SIZE]
            try:
                client.table("collectivities").insert(batch).execute()
                inserted += len(batch)
                print("  [{:,}/{:,}]".format(inserted, len(to_insert)), end="\r")
            except Exception as e:
                print("\n  ERROR: {}".format(e))
        print("\n  INSERT: {:,} OK".format(inserted))

    print("\n[DONE] Import termine!")

if __name__ == "__main__":
    main()
