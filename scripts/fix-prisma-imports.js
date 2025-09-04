#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function findFiles(dir, pattern, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      findFiles(fullPath, pattern, files);
    } else if (stat.isFile() && fullPath.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Find all TypeScript files in src directory
const srcDir = path.join(process.cwd(), 'src');
const files = findFiles(srcDir, '*.ts');

let fixedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  // Check if file imports PrismaClient and creates new instance
  if (content.includes('import { PrismaClient } from "@prisma/client"') && 
      content.includes('const prisma = new PrismaClient()')) {
    
    // Replace import and instantiation with lib/prisma import
    content = content.replace(
      /import { PrismaClient } from "@prisma\/client";\s*\n\s*const prisma = new PrismaClient\(\);?/g,
      'import { prisma } from "@/lib/prisma";'
    );
    
    // Also handle cases where there might be extra lines between
    content = content.replace(
      /import { PrismaClient } from "@prisma\/client";\s*\n\s*\n\s*const prisma = new PrismaClient\(\);?/g,
      'import { prisma } from "@/lib/prisma";'
    );

    modified = true;
  }

  // Also check for just PrismaClient import without prisma variable (for other patterns)
  if (content.includes('import { PrismaClient } from "@prisma/client"') && 
      !content.includes('import { prisma }')) {
    content = content.replace(
      'import { PrismaClient } from "@prisma/client";',
      'import { prisma } from "@/lib/prisma";'
    );
    
    // Replace new PrismaClient() with prisma
    content = content.replace(/new PrismaClient\(\)/g, 'prisma');
    
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✅ Fixed: ${path.relative(process.cwd(), file)}`);
    fixedCount++;
  }
});

console.log(`\n🎉 Fixed ${fixedCount} files with incorrect Prisma imports`);