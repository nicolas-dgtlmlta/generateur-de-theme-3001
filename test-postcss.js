import postcss from 'postcss';
import paletteGenerator from './scripts/postcss-plugins/palette-generator.js';
import fs from 'fs';

// Lire le fichier CSS source
const css = fs.readFileSync('styles/base/theme.css', 'utf8');

// Traiter avec PostCSS
postcss([paletteGenerator()])
  .process(css, { from: 'styles/base/theme.css', to: 'styles/base/theme-generated.css' })
  .then(result => {
    // Écrire le résultat
    fs.writeFileSync('styles/base/theme-generated.css', result.css);
    
    if (result.map) {
      fs.writeFileSync('styles/base/theme-generated.css.map', result.map.toString());
    }
    
    console.log('✅ Génération réussie !');
    console.log(`📊 ${result.css.split('\n').length} lignes générées`);
    
    // Afficher un aperçu des variables générées
    const lines = result.css.split('\n');
    const variableLines = lines.filter(line => line.includes('--') && line.includes(':'));
    console.log(`🎨 ${variableLines.length} variables CSS générées`);
    
    // Exemple de variables générées
    console.log('\n📝 Exemple de variables générées :');
    const examples = variableLines.slice(0, 5).map(line => line.trim());
    examples.forEach(line => console.log(`   ${line}`));
    
  })
  .catch(err => {
    console.error('❌ Erreur lors de la génération :', err);
  });
