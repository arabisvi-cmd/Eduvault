const fs = require('fs');
const readline = require('readline');

async function processTranscript() {
  const fileStream = fs.createReadStream('/Users/prithviraju/.gemini/antigravity-ide/brain/4ded8065-af28-4202-935d-8eb02c312697/.system_generated/logs/transcript_full.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const files = {};
  
  for await (const line of rl) {
    if (!line.trim()) continue;
    const step = JSON.parse(line);
    
    // Stop processing if we reach Task 12 (step 990)
    if (step.step_index >= 990) {
      break;
    }

    if (step.type === 'VIEW_FILE' && step.content) {
      // The content format is:
      // Created At: ...
      // Completed At: ...
      // File Path: `file:///Users/prithviraju/work/Eduvault/src/App.jsx`
      // Total Lines: ...
      // Total Bytes: ...
      // Showing lines ...
      // The following code has been modified to include a line number before every line...
      // 1: ...
      
      const match = step.content.match(/File Path: `file:\/\/[^`]+?([^/]+?\.jsx)`/);
      if (match) {
        const filename = match[1];
        if (['App.jsx', 'MySubjects.jsx', 'SubjectVault.jsx', 'AdminAcademicManager.jsx', 'Notices.jsx', 'GlobalSearch.jsx'].includes(filename)) {
            // Extract code lines
            const lines = step.content.split('\n');
            const codeLines = [];
            let inCode = false;
            for (let l of lines) {
                if (l.match(/^\d+:/)) {
                    codeLines.push(l.replace(/^\d+:\s?/, ''));
                }
            }
            if (codeLines.length > 0) {
                if (!files[filename]) files[filename] = [];
                // this assumes we are getting the full file, or we might need to stitch them.
                // But view_file returns max 800 lines. Let's just save whatever we get last.
                files[filename] = codeLines.join('\n');
            }
        }
      }
    }
    
    if (step.type === 'CODE_ACTION' && step.content) {
        // Multi replace tool sometimes prints the diff. 
        // We'd better just find the state.
    }
  }

  // Dump to .bak files
  for (const [filename, content] of Object.entries(files)) {
    fs.writeFileSync(`./src/${filename}.bak`, content);
    console.log(`Recovered ${filename} from before Task 12`);
  }
}

processTranscript();
