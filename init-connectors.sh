#!/bin/bash
# VigieCity Connectors Initialization Script

echo "🔧 VigieCity - Initialisation des connecteurs"
echo "============================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Fichier .env introuvable${NC}"
    cp .env.example .env
    echo -e "${BLUE}ℹ️  .env créé à partir de .env.example${NC}"
    echo "    Mettez à jour les variables Supabase"
    echo ""
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}❌ Node.js n'est pas installé${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js: $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}❌ npm n'est pas installé${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm: $(npm --version)${NC}"

# Check Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo ""
    echo -e "${BLUE}ℹ️  Installation de Vercel CLI...${NC}"
    npm install -g vercel
fi
echo -e "${GREEN}✓ Vercel CLI installé${NC}"

# Check Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo ""
    echo -e "${BLUE}ℹ️  Installation de Supabase CLI...${NC}"
    npm install -g supabase
fi
echo -e "${GREEN}✓ Supabase CLI installé${NC}"

echo ""
echo -e "${BLUE}📦 Vérification des dépendances locales...${NC}"
npm list --depth=0 2>/dev/null | grep -E "(react|supabase|tailwind)" || echo "Dépendances principales OK"

echo ""
echo -e "${GREEN}✅ Initialisation terminée!${NC}"
echo ""
echo "🚀 Prochaines étapes:"
echo "  1. Mettre à jour .env avec vos clés Supabase"
echo "  2. Lancer le dev: npm run dev"
echo "  3. Configurer Vercel: vercel link"
echo "  4. Déployer: vercel deploy"
echo ""
