const toggleButtons = document.querySelectorAll('.toggle-sidebar');
const container = document.querySelector('.container');
const sidebar = document.querySelector('.sidebar');
const filePicker = document.getElementById('filepicker');
const imagePreview = document.getElementById('image-preview');
const invertCheckbox = document.getElementById('invert');
const output = document.getElementById('output');
const copyButton = document.getElementById('copy');
const downloadTxtButton = document.getElementById('download-txt');
const downloadImgButton = document.getElementById('download-img');
const widthInput = document.getElementById('width');

toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
        container.classList.toggle('sidebar-hidden');
    });
});

filePicker.addEventListener('change', event => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            imagePreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

invertCheckbox.addEventListener('change', () => {
    document.body.classList.toggle('invert', invertCheckbox.checked);
});

copyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(output.innerText);
});

downloadTxtButton.addEventListener('click', () => {
    const blob = new Blob([output.innerText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

downloadImgButton.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const lineHeight = parseInt(getComputedStyle(output).fontSize) * 1.2;
    const lines = output.innerText.split('\n');
    const fontSize = parseInt(getComputedStyle(output).fontSize);
    const charWidth = fontSize - 4; // Each character takes up space equal to the font-size

    // Calculate canvas width based on the longest line of text
    const maxLineWidth = Math.max(...lines.map(line => line.length));
    canvas.width = maxLineWidth * charWidth;
    canvas.height = lines.length * lineHeight;

    context.font = `${fontSize}px monospace`;
    context.fillStyle = getComputedStyle(output).color;
    context.textBaseline = 'top'; // Ensure text starts from the top

    lines.forEach((line, index) => {
        context.fillText(line, 0, index * lineHeight);
    });

    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'output.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
});
