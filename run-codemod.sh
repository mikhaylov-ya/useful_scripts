find . -name "*.vue" -print0 | xargs -0 -I{} npx ~/Documents/vue-codemod-revanced -t options-to-composition "{}"
