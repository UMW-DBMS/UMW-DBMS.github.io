window.onload = function() {

    // Show README modal on load
    document.getElementById('readme-modal').style.display = 'flex';

    // Close README modal
    document.getElementById('close-readme').onclick = function() {
        document.getElementById('readme-modal').style.display = 'none';
    };

    // Show README modal when "Help" button is clicked
    document.getElementById('help-button').onclick = function() {
        document.getElementById('readme-modal').style.display = 'flex';
    };
};
