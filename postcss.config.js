import postcssImport from 'postcss-import'
import postcssCssnext from 'postcss-cssnext'
import paletteGenerator from './scripts/postcss-plugins/palette-generator.js'
import postcssTrigonometricFunctions from '@csstools/postcss-trigonometric-functions'

export default {
  plugins: [
    postcssImport(),
    postcssTrigonometricFunctions(), // Exécuter en premier pour gérer les fonctions trigonométriques
    paletteGenerator() // Ensuite générer les palettes avec les formules contenant sin()
    // postcssCssnext désactivé pour éviter les conflits avec les custom properties
  ]
}
