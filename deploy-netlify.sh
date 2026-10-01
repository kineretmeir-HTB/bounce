#!/usr/bin/env bash
# מעלה אפליקציה אחת ל-Netlify, כאתר נפרד משלה.
# שימוש: ./deploy-netlify.sh <תיקיית-אפליקציה> <שם-אתר-ב-Netlify>
# לדוגמה: ./deploy-netlify.sh nitzahonot bounce-nitzahonot
#
# למה אתר נפרד? כרום באנדרואיד מתייחס לכל האפליקציות באותו אתר כאפליקציה אחת,
# ולכן אי אפשר להתקין שתיים מאותה כתובת (גילינו את זה עם אפר"ת והניצחונות).
set -euo pipefail
APP="$1"
SITE="$2"
ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT="$ROOT/.dist/$APP"

rm -rf "$OUT"
mkdir -p "$OUT"
cp -r "$ROOT/$APP/." "$OUT/"
cp -r "$ROOT/fonts" "$OUT/fonts"
# באתר הנפרד הפונטים יושבים בתוך האפליקציה ולא בתיקייה שמעליה
grep -rlZ '\.\./fonts/' "$OUT" | xargs -0 sed -i 's#\.\./fonts/#fonts/#g'
# שהטלפון תמיד יבדוק אם יש גרסה חדשה של קוד האופליין
cat > "$OUT/_headers" <<'EOF'
/sw.js
  Cache-Control: no-cache
/manifest.json
  Cache-Control: no-cache
EOF

npx -y netlify-cli@latest deploy --prod --dir "$OUT" --site "$SITE" --no-build
