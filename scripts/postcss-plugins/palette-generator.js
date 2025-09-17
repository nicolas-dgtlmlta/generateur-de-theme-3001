// Configuration des niveaux de couleurs (réduite aux standards)
const COLOR_LEVELS = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// Configuration des paramètres de la courbe de chroma
const CHROMA_CURVE = {
  MIN_RATIO: 0.32,      // Valeur minimale de la courbe (niveaux extrêmes)
  MAX_RATIO: 1.00,      // Valeur maximale de la courbe (niveau médian)
  RANGE: 0.68           // Amplitude de la courbe (MAX_RATIO - MIN_RATIO)
};

// Noms des palettes - Les valeurs chroma sont maintenant dynamiques via CSS
const PALETTE_NAMES = ['gray', 'primary', 'secondary', 'tertiary'];

// Plugin PostCSS principal
const paletteGenerator = () => ({
  postcssPlugin: 'postcss-palette-generator',
  Once(root, { result, postcss }) {
    const selector = ':root, .nested-palette';
    // Trouver ou créer la règle :root
    let rootRule = root.nodes.find(node => node.type === 'rule' && node.selector === selector);
    
    if (!rootRule) {
      rootRule = postcss.rule({ selector: selector });
      root.prepend(rootRule);
    }

    // Générer les formules de base
    generateBaseFormulas(rootRule, postcss);
    
    // Générer les palettes de couleurs
    generateColorPalettes(rootRule, postcss);
    
    // Générer les alias sémantiques
    generateSemanticAliases(rootRule, postcss);
  }
});

paletteGenerator.postcss = true;

/**
 * Génère les formules de base (lightness et chroma)
 */
function generateBaseFormulas(rootRule, postcss) {
  const stepMultiplier = 0.056;
  
  // Valeurs de luminosité personnalisées pour les extrêmes
  const extremeLightnessValues = {
    0: '99.7%',    // Presque blanc
    50: '98.5%',     // Très clair
    100: '95%',    // Proche du blanc
    200: '88%',    // Plus clair
    800: '25%',    // Plus foncé
    900: '15%',    // Très foncé
    950: '8%'      // Presque noir
  };
  
  COLOR_LEVELS.forEach((level, index) => {
    const stepIndex = index; // Index pour la progression sinusoïdale
    
    // Utiliser la valeur personnalisée si elle existe, sinon la formule sinusoïdale
    const lightnessValue = extremeLightnessValues[level] ?? `calc(98% - 88% * sin(${stepMultiplier} * ${stepIndex} * 1.5708))`;
    
    // Ajouter les variables CSS
    rootRule.append(
      postcss.decl({
        prop: `--lightness-formula-${level}`,
        value: lightnessValue
      })
    );
  });
}

/**
 * Génère les palettes de couleurs
 */
function generateColorPalettes(rootRule, postcss) {
  // Configuration de base pour la luminosité et chroma
  rootRule.append(postcss.decl({ prop: '--step-multiplier', value: '0.056' }));
  
  // Définir les valeurs par défaut pour les variables chroma (peuvent être redéfinies dans le CSS)
  PALETTE_NAMES.forEach(paletteName => {
    if (paletteName === 'gray') {
      // Valeurs par défaut pour la palette grise
      rootRule.append(postcss.decl({ prop: '--gray-chroma-base', value: '0.01' }));
      // Palette de gris spéciale
      generateGrayPalette(rootRule, postcss);
    } else {
      // Valeurs par défaut pour les palettes colorées
      rootRule.append(postcss.decl({ prop: `--${paletteName}-chroma-base`, value: '0.15' }));
      generateColorPalette(rootRule, paletteName, postcss);
    }
  });
}

/**
 * Génère une palette de couleurs colorées
 * Les teintes sont maintenant définies dynamiquement dans le CSS via --primary-hue, --secondary-hue, etc.
 */
function generateColorPalette(rootRule, paletteName, postcss) {
  // Générer les formules de chroma spécifiques en utilisant les variables CSS dynamiques
  COLOR_LEVELS.forEach((level, index) => {
    const chromaValue = calculateChromaFormula(index, paletteName);
    rootRule.append(postcss.decl({
      prop: `--${paletteName}-chroma-formula-${level}`,
      value: chromaValue
    }));
  });
  
  // Générer les variables de couleurs OKLCH en utilisant les teintes déjà définies dans le CSS
  COLOR_LEVELS.forEach(level => {
    const oklchValue = `oklch(var(--lightness-formula-${level}) var(--${paletteName}-chroma-formula-${level}) var(--${paletteName}-hue))`;
    rootRule.append(postcss.decl({
      prop: `--${paletteName}-${level}`,
      value: oklchValue
    }));
  });
}

/**
 * Génère la palette de gris spéciale
 */
function generateGrayPalette(rootRule, postcss) {
  // La palette de gris utilise la teinte primaire avec atténuation
  rootRule.append(postcss.decl({
    prop: '--gray-hue',
    value: 'var(--primary-hue)'
  }));
  
  // Générer les formules de chroma spécifiques pour la palette grise
  COLOR_LEVELS.forEach((level, index) => {
    const chromaValue = calculateChromaFormula(index, 'gray');
    rootRule.append(postcss.decl({
      prop: `--gray-chroma-formula-${level}`,
      value: chromaValue
    }));
  });
  
  // Générer les variables de gris OKLCH en utilisant ses propres formules de chroma
  COLOR_LEVELS.forEach(level => {
    const oklchValue = `oklch(var(--lightness-formula-${level}) var(--gray-chroma-formula-${level}) var(--gray-hue))`;
    rootRule.append(postcss.decl({
      prop: `--gray-${level}`,
      value: oklchValue
    }));
  });
}

/**
 * Calcule la formule de chroma avec courbe dynamique
 * Génère une courbe qui monte puis descend basée sur le nombre réel de niveaux
 */
function calculateChromaFormula(index, paletteName) {
  const totalLevels = COLOR_LEVELS.length;
  const peakIndex = Math.floor(totalLevels / 2);
  
  // Calcul du ratio de forme (MIN_RATIO à MAX_RATIO puis retour à MIN_RATIO)
  const shapeRatio = index <= peakIndex 
    ? (index / peakIndex) * CHROMA_CURVE.RANGE + CHROMA_CURVE.MIN_RATIO
    : ((totalLevels - 1 - index) / (totalLevels - 1 - peakIndex)) * CHROMA_CURVE.RANGE + CHROMA_CURVE.MIN_RATIO;
  
  return `calc(${shapeRatio.toFixed(2)} * var(--${paletteName}-chroma-base))`;
}

/**
 * Génère les alias sémantiques
 */
function generateSemanticAliases(rootRule, postcss) {
  // Alias pour les gris
  const grayAliases = {
    '--surface-lightest': '--gray-0',
    '--surface-lighter': '--gray-50',
    '--surface-light': '--gray-100',
    '--surface': '--gray-200',
    '--surface-dark': '--gray-300',
    '--text-subtle': '--gray-400',
    '--text-muted': '--gray-500',
    '--text': '--gray-900',
    '--text-strong': '--gray-900',
    '--border-light': '--gray-200',
    '--border': '--gray-300',
    '--border-dark': '--gray-400'
  };
  
  Object.entries(grayAliases).forEach(([alias, target]) => {
    rootRule.append(postcss.decl({
      prop: alias,
      value: `var(${target})`
    }));
  });
  
  // Alias pour les palettes colorées
  ['primary', 'secondary', 'tertiary'].forEach(paletteName => {
    const aliases = {
      [`--${paletteName}-lightest`]: `--${paletteName}-50`,
      [`--${paletteName}-light`]: `--${paletteName}-100`,
      [`--${paletteName}-lighter`]: `--${paletteName}-200`,
      [`--${paletteName}`]: `--${paletteName}-500`,
      [`--${paletteName}-darker`]: `--${paletteName}-700`,
      [`--${paletteName}-dark`]: `--${paletteName}-800`,
      [`--${paletteName}-darkest`]: `--${paletteName}-950`
    };
    
    Object.entries(aliases).forEach(([alias, target]) => {
      rootRule.append(postcss.decl({
        prop: alias,
        value: `var(${target})`
      }));
    });
  });
}

export default paletteGenerator;
