
// --- Dynamic Theme Loading ---
async function loadThemes() {
    const themeSelector = document.getElementById('themeSelector');
    const themeStylesheet = document.getElementById('theme-stylesheet');

    if (!themeSelector || !themeStylesheet) return;

    try {
        // Fetch the static JSON manifest
        const response = await fetch('/static/css/themes/themes.json');
        if (!response.ok) throw new Error("Could not find themes.json");

        const themes = await response.json();
        const currentTheme = localStorage.getItem('tibialy_theme') || 'bailando';

        // Clear any existing options just in case
        themeSelector.innerHTML = '';

        // Populate dropdown
        themes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme;
            option.textContent = theme.charAt(0).toUpperCase() + theme.slice(1).replace('-', ' ');
            themeSelector.appendChild(option);
        });

        // Apply current theme
        themeStylesheet.href = `/static/css/themes/${currentTheme}.css`;
        if (themes.includes(currentTheme)) {
            themeSelector.value = currentTheme;
        } else {
            themeSelector.value = 'default';
        }

    } catch (error) {
        console.error("Failed to load themes:", error);
        // Fallback option if fetch fails
        themeSelector.innerHTML = '<option value="default">Default</option>';
    }
}

// Theme change listener
document.getElementById('themeSelector')?.addEventListener('change', (e) => {
    const newTheme = e.target.value;
    document.getElementById('theme-stylesheet').href = `/static/css/themes/${newTheme}.css`;
    localStorage.setItem('tibialy_theme', newTheme);
});

// Run when page loads
document.addEventListener('DOMContentLoaded', loadThemes);
