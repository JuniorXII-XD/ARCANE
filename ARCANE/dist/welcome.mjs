const dialog=document.getElementById('welcome'),tabs=[...dialog.querySelectorAll('[data-welcome-page]')],sections=[...dialog.querySelectorAll('[data-welcome-section]')];
let page=0,opener=null;
function showPage(index){page=Math.max(0,Math.min(2,index));dialog.dataset.page=page;sections.forEach((section,i)=>section.hidden=i!==page);tabs.forEach((tab,i)=>{if(i===page)tab.setAttribute('aria-current','step');else tab.removeAttribute('aria-current')});dialog.setAttribute('aria-labelledby',sections[page].querySelector('h2').id||`welcome-heading-${page}`);sections[page].querySelector('h2').id=dialog.getAttribute('aria-labelledby');dialog.querySelector('.welcome-content').scrollTop=0}
function open(index,trigger){opener=trigger||document.activeElement;showPage(index);if(!dialog.open)dialog.showModal();document.body.classList.add('welcome-open');}
function close(){dialog.close()}
tabs.forEach((tab,i)=>tab.addEventListener('click',()=>showPage(i)));
document.getElementById('welcome-close').addEventListener('click',close);
dialog.addEventListener('close',()=>{document.body.classList.remove('welcome-open');if(opener?.isConnected)opener.focus()});
for(const trigger of document.querySelectorAll('.guide-link,#guide'))trigger.addEventListener('click',event=>{event.preventDefault();open(1,trigger)});
open(0);
