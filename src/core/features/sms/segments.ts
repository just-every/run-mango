// GSM 03.38 default alphabet; extension characters consume an escape septet.
const basic=new Set(Array.from('@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'));
const extension=new Set(Array.from('^{}\\[~]|€\f'));
export function smsSegments(text:string){
 let units=0,unicode=false;
 for(const character of text){if(basic.has(character))units++;else if(extension.has(character))units+=2;else{unicode=true;break;}}
 if(unicode)units=text.length; // UTF-16 units: supplementary characters occupy two.
 const single=unicode?70:160,multipart=unicode?67:153;
 return {encoding:unicode?'UTF-16':'GSM-7',units,segments:units<=single?1:Math.ceil(units/multipart)};
}
