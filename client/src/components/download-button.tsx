
import { Button } from "./ui/button";
import { Download } from "lucide-react";

export function DownloadButton() {
  const handleDownload = async () => {
    try {
      const response = await fetch('/api/download-project');
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ErgoTrack-Project.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading project:', error);
      alert('Failed to download project');
    }
  };

  return (
    <Button onClick={handleDownload} className="flex items-center gap-2">
      <Download size={16} />
      Download Project
    </Button>
  );
}
