mkdir -p public

CACHEBUST=$(date +%s)

browserify --plugin esmify js/index.js | terser > public/index.js
sed -i "s/simplify-worker\.js/simplify-worker\.js\?$CACHEBUST/g" public/index.js

cp index.html public/
sed -i "s/\.js/\.js\?$CACHEBUST/g" public/index.html
sed -i "s/\.css/\.css\?$CACHEBUST/g" public/index.html

cp -r styles public/

mkdir -p public/js/workers
browserify --plugin esmify js/workers/simplify-worker.js | terser > public/js/workers/simplify-worker.js
