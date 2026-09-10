const hex=(h:string)=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const lin=(c:number)=>c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);
const L=(h:string)=>{const[r,g,b]=hex(h).map(lin);return 0.2126*r+0.7152*g+0.0722*b;};
const ratio=(a:string,b:string)=>{const[x,y]=[L(a),L(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05);};
const P={navy:"#001450",white:"#FFFFFF",lychee:"#FF275B",turq:"#7FEBE9",grey:"#333333",lilac:"#A08DF4"};
const pairs:[string,string][]=[["navy","white"],["navy","turq"],["navy","lychee"],["white","lychee"],["white","turq"],["grey","turq"],["grey","white"],["navy","lilac"],["white","lilac"],["grey","lychee"]];
console.log("fg/bg".padEnd(18),"ratio","  AA-body  AA-large");
for(const[a,b]of pairs){
  const r=ratio(P[a as keyof typeof P],P[b as keyof typeof P]);
  console.log(`${a} on ${b}`.padEnd(18), r.toFixed(2).padStart(5),
    (r>=4.5?"  PASS  ":"  FAIL  "), (r>=3?" PASS":" FAIL"));
}
