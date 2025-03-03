const fs = require('fs');
const path = require('path');

const googleTag = `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-CC05YMB8B1"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-CC05YMB8B1');
</script>
`;

function addGoogleTagToFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if the tag is already present
  if (content.includes('G-CC05YMB8B1')) {
    console.log(`Tag already exists in ${filePath}`);
    return;
  }
  
  // Insert the tag before the closing head tag
  const headCloseIndex = content.indexOf('</head>');
  if (headCloseIndex !== -1) {
    content = content.slice(0, headCloseIndex) + googleTag + content.slice(headCloseIndex);
    fs.writeFileSync(filePath, content);
    console.log(`Added tag to ${filePath}`);
  } else {
    console.log(`Could not find </head> in ${filePath}`);
  }
}

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      processDirectory(filePath);
    } else if (path.extname(file).toLowerCase() === '.html') {
      addGoogleTagToFile(filePath);
    }
  });
}

// Start processing from the current directory
processDirectory('.'); 