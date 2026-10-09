const MAX=5*1024*1024;
export function sniffLogo(bytes) {
  const s=String.fromCharCode(...bytes.slice(0,32));
  if(bytes[0]===137&&s.slice(1,4)==='PNG'&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10)return 'png';
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'jpeg';
  if(s.startsWith('RIFF')&&s.slice(8,12)==='WEBP')return 'webp';
  if(s.slice(4,8)==='ftyp'&&/avif|avis/.test(s.slice(8)))return 'avif';
  if(s.startsWith('%PDF-'))return 'pdf';
  throw Error('The file contents are not a supported logo format.');
}
export async function convertLogo(file) {
  if(!file||file.size>MAX||file.size<8)throw Error('Choose a logo up to 5 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer()), kind=sniffLogo(bytes);
  const ext=file.name.toLowerCase().split('.').pop();
  if(!({png:['png'],jpeg:['jpg','jpeg'],webp:['webp'],avif:['avif'],pdf:['pdf']}[kind].includes(ext)))throw Error('The logo extension does not match its contents.');
  const canvas=document.createElement('canvas'); let source, task;
  try {
    if(kind==='pdf') {
      const pdfjs=await import('./vendor/pdf.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc='/assets/vendor/pdf.worker.mjs';
      task=pdfjs.getDocument({data:bytes,isEvalSupported:false,enableXfa:false,useSystemFonts:true,maxImageSize:16000000,stopAtErrors:true});
      const pdf=await task.promise;
      if(pdf.numPages>10)throw Error('PDF logos may contain at most 10 pages; only page 1 is used.');
      const page=await pdf.getPage(1), base=page.getViewport({scale:1});
      const view=page.getViewport({scale:Math.min(2,1200/Math.max(base.width,base.height))});
      canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport:view,background:'rgba(255,255,255,0)'}).promise;
    } else {
      source=await createImageBitmap(new Blob([bytes],{type:`image/${kind}`}));
      if(source.width>8192||source.height>8192||source.width*source.height>16000000)throw Error('Logo dimensions exceed the 16 megapixel limit.');
      const scale=Math.min(1,1200/Math.max(source.width,source.height));
      canvas.width=Math.max(1,Math.round(source.width*scale));canvas.height=Math.max(1,Math.round(source.height*scale));
      canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);
    }
    const data=canvas.toDataURL('image/png');
    if(data.length>1400000)throw Error('This logo is too detailed. Upload a smaller version.');
    return data;
  } finally {source?.close();await task?.destroy();}
}
