const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'src/views');
const files = fs.readdirSync(viewsDir).filter(f => f.endsWith('.vue'));

files.forEach(file => {
    if (['Setup.vue', 'Login.vue'].includes(file)) return;
    const filePath = path.join(viewsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace Sidebar HTML
    content = content.replace(/<!-- Sidebar -->[\s\S]*?<\/aside>/, '<Sidebar />');

    // Insert import Sidebar
    if (!content.includes('import Sidebar')) {
        content = content.replace(/<script setup>\n/, "<script setup>\nimport Sidebar from '../components/Sidebar.vue'\n");
    }

    // Remove logout function definition
    content = content.replace(/const logout = async \(\) => {[\s\S]*?(?<=router\.push\('\/login'\)\s*)\n}/, '');

    // Remove Sidebar CSS section (looks for comments starting with /* Sidebar and goes until the next comment block)
    content = content.replace(/\/\*\s*Sidebar[\s\S]*?(?=\n\/\*\s*(Main|Apps|Terminal|Files|Domains|Settings|Dashboard|Detail|Processes|Service))/, '');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Refactored ${file}`);
});
