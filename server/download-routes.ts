import { Router } from 'express';
import fs from 'fs';
import archiver from 'archiver';
import path from 'path';

const router = Router();

router.get('/download-project', async (req, res) => {
  try {
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    res.attachment('ErgoTrack-Project.zip');
    archive.pipe(res);

    // Exclude unnecessary directories
    const excludeDirs = [
      'node_modules',
      '.git',
      'dist',
      '.replit',
      'movenet_env',
      '.local',
      'attached_assets'
    ];

    const excludeFiles = [
      '.env',
      '.env.local',
      'create-zip.js'
    ];

    function shouldExclude(filePath: string): boolean {
      const relativePath = path.relative('.', filePath);
      
      for (const dir of excludeDirs) {
        if (relativePath.startsWith(dir + path.sep) || relativePath === dir) {
          return true;
        }
      }
      
      if (excludeFiles.includes(path.basename(filePath))) {
        return true;
      }
      
      return false;
    }

    function addDirectory(dir: string, zipPath: string = '') {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const relativePath = path.join(zipPath, file);
        
        if (shouldExclude(fullPath)) {
          return;
        }
        
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          addDirectory(fullPath, relativePath);
        } else {
          archive.file(fullPath, { name: relativePath });
        }
      });
    }

    addDirectory('.');
    
    await archive.finalize();
  } catch (error) {
    console.error('Error creating zip:', error);
    res.status(500).json({ error: 'Failed to create project zip' });
  }
});

export default router;