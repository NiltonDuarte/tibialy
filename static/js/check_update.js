window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/system/update-check');
        const data = await response.json();

        if (data.update_available) {
            // Show the banner and inject the new version details
            document.getElementById('new-version-text').textContent = 'v' + data.latest_version;
            document.getElementById('update-link').href = data.release_url;
            document.getElementById('update-banner').style.display = 'block';
        }
    } catch (error) {
        console.error("Failed to check for updates:", error);
    }
});
