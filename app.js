let config;
let pairs = [];
let responses = [];
let current = 0;

fetch("config.json")
.then(r=>r.json())
.then(data=>{

config=data;

title.innerText=config.testName;

generatePairs();

showPair();

});

function generatePairs(){

const items=config.items;

for(let i=0;i<items.length;i++){

for(let j=i+1;j<items.length;j++){

pairs.push([items[i],items[j]]);

}

}

}

function showPair(){

if(current>=pairs.length){

finish();

return;

}

let pair=pairs[current];

leftImage.src=pair[0].image;
rightImage.src=pair[1].image;

leftName.innerText=pair[0].name;
rightName.innerText=pair[1].name;

progress.innerText=`${current+1} / ${pairs.length}`;

preference.value=0;

comment.value="";

}

nextButton.onclick=function(){

let pair=pairs[current];

responses.push({

left:pair[0].name,

right:pair[1].name,

preference:Number(preference.value),

comment:comment.value

});

current++;

showPair();

}

function finish(){

document.querySelector(".comparison").style.display="none";

document.querySelector(".slider").style.display="none";

comment.style.display="none";

nextButton.style.display="none";

finish.style.display="block";

}

exportCSV.onclick=function(){

let csv="Left Image,Right Image,Preference,Comment\n";

responses.forEach(r=>{

csv+=`"${r.left}","${r.right}",${r.preference},"${r.comment.replace(/"/g,'""')}"\n`;

});

download(csv,"results.csv");

}

function download(content,file){

const blob=new Blob([content],{type:"text/csv"});

const url=URL.createObjectURL(blob);

const a=document.createElement("a");

a.href=url;

a.download=file;

a.click();

URL.revokeObjectURL(url);

}
