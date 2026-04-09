import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Define types for jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
}

export const generatePDF = (title: string, columns: string[], data: any[][], fileName: string) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;

  // Header
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  const date = new Date().toLocaleDateString('pt-BR');
  doc.text(`Gerado em: ${date}`, 14, 30);

  // Table
  autoTable(doc, {
    head: [columns],
    body: data,
    startY: 40,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Página ${i} de ${pageCount} - Nacional Hidro`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  doc.save(`${fileName}_${Date.now()}.pdf`);
};

export const generateXML = (data: any[], fileName: string) => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<rows>\n';
    
    data.forEach((row, index) => {
        xml += `  <row id="${index}">\n`;
        Object.keys(row).forEach(key => {
            xml += `    <${key}>${row[key]}</${key}>\n`;
        });
        xml += '  </row>\n';
    });
    
    xml += '</rows>';
    
    const blob = new Blob([xml], { type: 'text/xml' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}_${Date.now()}.xml`;
    a.click();
    window.URL.revokeObjectURL(url);
};
