const fetch = require("node-fetch");
const { createCanvas, loadImage } = require('canvas');
const {
  argbFromRgb,
  hexFromArgb,
  themeFromSourceColor,
} = require("@material/material-color-utilities");

/**
 * Fetches an image from a URL and returns it as an ArrayBuffer
 * @param {string} imageUrl - URL of the image to fetch
 * @returns {Promise<ArrayBuffer>} - ArrayBuffer containing the image data
 */
async function fetchImageData(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    return await response.arrayBuffer();
  } catch (error) {
    console.error("Error fetching image:", error);
    throw error;
  }
}

async function sourceColorFromImage(imageData) {
  try {
    const image = await loadImage(imageData);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    
    const imagePixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    
    // Calculate the average color from the image pixels
    let r = 0, g = 0, b = 0, count = 0;
    
    for (let i = 0; i < imagePixels.length; i += 4) {
      r += imagePixels[i];
      g += imagePixels[i + 1];
      b += imagePixels[i + 2];
      count++;
    }
    
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);
    
    return argbFromRgb(r, g, b);
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

/**
 * Generates Material You color scheme from an image URL
 * @param {string} imageUrl - URL of the image to generate colors from
 * @param {boolean} isDark - Whether to generate dark theme colors
 * @returns {Promise<Object>} - Object containing Material You color scheme
 */
async function generateColorsFromImageUrl(imageUrl, isDark = false) {
  try {
    // Fetch the image data
    const imageData = await fetchImageData(imageUrl);

    // Extract the source color from the image
    const sourceColor = await sourceColorFromImage(imageData);

    // Generate a theme from the source color
    const theme = themeFromSourceColor(sourceColor);

    // Convert the theme to a more usable format
    const colorScheme = {};

    // Get the appropriate scheme based on light/dark preference
    const scheme = isDark ? theme.schemes.dark : theme.schemes.light;

    // Extract all colors from the scheme
    colorScheme.primary = hexFromArgb(scheme.primary);
    colorScheme.onPrimary = hexFromArgb(scheme.onPrimary);
    colorScheme.primaryContainer = hexFromArgb(scheme.primaryContainer);
    colorScheme.onPrimaryContainer = hexFromArgb(scheme.onPrimaryContainer);
    colorScheme.secondary = hexFromArgb(scheme.secondary);
    colorScheme.onSecondary = hexFromArgb(scheme.onSecondary);
    colorScheme.secondaryContainer = hexFromArgb(scheme.secondaryContainer);
    colorScheme.onSecondaryContainer = hexFromArgb(scheme.onSecondaryContainer);
    colorScheme.tertiary = hexFromArgb(scheme.tertiary);
    colorScheme.onTertiary = hexFromArgb(scheme.onTertiary);
    colorScheme.tertiaryContainer = hexFromArgb(scheme.tertiaryContainer);
    colorScheme.onTertiaryContainer = hexFromArgb(scheme.onTertiaryContainer);
    colorScheme.error = hexFromArgb(scheme.error);
    colorScheme.onError = hexFromArgb(scheme.onError);
    colorScheme.errorContainer = hexFromArgb(scheme.errorContainer);
    colorScheme.onErrorContainer = hexFromArgb(scheme.onErrorContainer);
    colorScheme.background = hexFromArgb(scheme.background);
    colorScheme.onBackground = hexFromArgb(scheme.onBackground);
    colorScheme.surface = hexFromArgb(scheme.surface);
    colorScheme.onSurface = hexFromArgb(scheme.onSurface);
    colorScheme.surfaceVariant = hexFromArgb(scheme.surfaceVariant);
    colorScheme.onSurfaceVariant = hexFromArgb(scheme.onSurfaceVariant);
    colorScheme.outline = hexFromArgb(scheme.outline);
    colorScheme.outlineVariant = hexFromArgb(scheme.outlineVariant);
    colorScheme.shadow = hexFromArgb(scheme.shadow);
    colorScheme.scrim = hexFromArgb(scheme.scrim);
    colorScheme.inverseSurface = hexFromArgb(scheme.inverseSurface);
    colorScheme.inverseOnSurface = hexFromArgb(scheme.inverseOnSurface);
    colorScheme.inversePrimary = hexFromArgb(scheme.inversePrimary);

    return colorScheme;
  } catch (error) {
    console.error("Error generating colors:", error);
    throw error;
  }
}

/**
 * Generates a complete Material You color scheme from an image URL
 * Includes both light and dark themes, plus additional color tokens
 * @param {string} imageUrl - URL of the image to generate colors from
 * @returns {Promise<Object>} - Complete color scheme for database storage and frontend use
 */
async function generateFullColorScheme(imageUrl) {
  try {
    // Fetch the image data
    const imageData = await fetchImageData(imageUrl);

    // Extract the source color from the image
    const sourceColor = await sourceColorFromImage(imageData);

    // Generate a theme from the source color
    const theme = themeFromSourceColor(sourceColor);

    // Create the full color scheme object
    const fullColorScheme = {
      sourceColor: hexFromArgb(sourceColor),
      lightTheme: extractSchemeColors(theme.schemes.light),
      darkTheme: extractSchemeColors(theme.schemes.dark),
      palettes: {
        primary: extractPaletteColors(theme.palettes.primary),
        secondary: extractPaletteColors(theme.palettes.secondary),
        tertiary: extractPaletteColors(theme.palettes.tertiary),
        neutral: extractPaletteColors(theme.palettes.neutral),
        neutralVariant: extractPaletteColors(theme.palettes.neutralVariant),
        error: extractPaletteColors(theme.palettes.error),
      },
      customColors: theme.customColors
        ? theme.customColors.map((color) => ({
            value: hexFromArgb(color.value),
            light: extractSchemeColors(color.light),
            dark: extractSchemeColors(color.dark),
          }))
        : [],
      timestamp: new Date().toISOString(),
      meta: {
        imageUrl,
        generatedWith: "@material/material-color-utilities",
      },
    };

    return fullColorScheme;
  } catch (error) {
    console.error("Error generating full color scheme:", error);
    throw error;
  }
}

/**
 * Extracts all colors from a Material You color scheme
 * @param {Object} scheme - Material You color scheme
 * @returns {Object} - Object with all extracted colors
 */
function extractSchemeColors(scheme) {
  return {
    primary: hexFromArgb(scheme.primary),
    onPrimary: hexFromArgb(scheme.onPrimary),
    primaryContainer: hexFromArgb(scheme.primaryContainer),
    onPrimaryContainer: hexFromArgb(scheme.onPrimaryContainer),
    secondary: hexFromArgb(scheme.secondary),
    onSecondary: hexFromArgb(scheme.onSecondary),
    secondaryContainer: hexFromArgb(scheme.secondaryContainer),
    onSecondaryContainer: hexFromArgb(scheme.onSecondaryContainer),
    tertiary: hexFromArgb(scheme.tertiary),
    onTertiary: hexFromArgb(scheme.onTertiary),
    tertiaryContainer: hexFromArgb(scheme.tertiaryContainer),
    onTertiaryContainer: hexFromArgb(scheme.onTertiaryContainer),
    error: hexFromArgb(scheme.error),
    onError: hexFromArgb(scheme.onError),
    errorContainer: hexFromArgb(scheme.errorContainer),
    onErrorContainer: hexFromArgb(scheme.onErrorContainer),
    background: hexFromArgb(scheme.background),
    onBackground: hexFromArgb(scheme.onBackground),
    surface: hexFromArgb(scheme.surface),
    onSurface: hexFromArgb(scheme.onSurface),
    surfaceVariant: hexFromArgb(scheme.surfaceVariant),
    onSurfaceVariant: hexFromArgb(scheme.onSurfaceVariant),
    outline: hexFromArgb(scheme.outline),
    outlineVariant: hexFromArgb(scheme.outlineVariant),
    shadow: hexFromArgb(scheme.shadow),
    scrim: hexFromArgb(scheme.scrim),
    inverseSurface: hexFromArgb(scheme.inverseSurface),
    inverseOnSurface: hexFromArgb(scheme.inverseOnSurface),
    inversePrimary: hexFromArgb(scheme.inversePrimary),
  };
}

/**
 * Extracts colors from a Material You color palette at standard tone levels
 * @param {Object} palette - Material You color palette
 * @returns {Object} - Object with colors at different tone levels
 */
function extractPaletteColors(palette) {
  const tones = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100];
  const colors = {};

  tones.forEach((tone) => {
    colors[`tone${tone}`] = hexFromArgb(palette.tone(tone));
  });

  return colors;
}

/**
 * Creates a color from RGB values
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {string} - Hex color code
 */
function createColorFromRgb(r, g, b) {
  const argb = argbFromRgb(r, g, b);
  return hexFromArgb(argb);
}

/**
 * Generates Material You colors specifically for a profile/avatar picture
 * Optimized for portrait images with special handling for face tones
 * @param {string} profileImageUrl - URL of the profile image
 * @returns {Promise<Object>} - Complete color scheme optimized for profile pictures
 */
async function generateProfilePictureColors(profileImageUrl) {
  try {
    const response = await fetch(profileImageUrl);
    const buffer = await response.buffer();
    
    // Extract the source color from the image
    const sourceColor = await sourceColorFromImage(buffer);
    
    // Generate a theme from the source color
    const theme = themeFromSourceColor(sourceColor, {
      contrastLevel: 0.5,
    });

    // Create a color scheme object specifically for profile pictures
    const profileColorScheme = {
      sourceColor: hexFromArgb(sourceColor),
      lightTheme: extractSchemeColors(theme.schemes.light),
      darkTheme: extractSchemeColors(theme.schemes.dark),

      // Add a special section for avatar-specific UI elements
      avatarAccent: {
        primary: hexFromArgb(theme.palettes.primary.tone(40)),
        secondary: hexFromArgb(theme.palettes.secondary.tone(40)),
        border: hexFromArgb(theme.palettes.neutralVariant.tone(80)),
        highlight: hexFromArgb(theme.palettes.primary.tone(90)),
        shadow: hexFromArgb(theme.palettes.neutral.tone(10)),
      },

      // Include basic palette tones useful for avatar-related UI elements
      palettes: {
        primary: extractBasicPaletteColors(theme.palettes.primary),
        secondary: extractBasicPaletteColors(theme.palettes.secondary),
        neutral: extractBasicPaletteColors(theme.palettes.neutral),
      },

      timestamp: new Date().toISOString(),
      meta: {
        imageType: "profile",
        imageUrl: profileImageUrl,
        generatedWith: "@material/material-color-utilities",
      },
    };

    return profileColorScheme;
  } catch (error) {
    console.error("Error generating profile picture colors:", error);
    throw error;
  }
}

/**
 * Extracts a limited set of colors from a palette for profile picture use
 * @param {Object} palette - Material You color palette
 * @returns {Object} - Object with selected tone levels useful for profile UIs
 */
function extractBasicPaletteColors(palette) {
  // Select fewer tones relevant for profile picture UI
  const tones = [10, 30, 50, 70, 90];
  const colors = {};

  tones.forEach((tone) => {
    colors[`tone${tone}`] = hexFromArgb(palette.tone(tone));
  });

  return colors;
}

module.exports = {
  generateColorsFromImageUrl,
  createColorFromRgb,
  generateFullColorScheme,
  generateProfilePictureColors,
};
