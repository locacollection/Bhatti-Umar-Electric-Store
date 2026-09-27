window.BHATTI=window.BHATTI||{};

const BHATTI_PUBLIC_SITE_URL=new URL('./',window.location.href).href;
const BHATTI_EMAIL_CONFIRMATION_URL=new URL('verify.html',BHATTI_PUBLIC_SITE_URL).href;
const BHATTI_PENDING_EMAIL_KEY='loca_pending_verification_email';
let verificationCooldownTimer=null;

function isVerifiedUser(user){
  return Boolean(user?.email_confirmed_at||user?.confirmed_at);
}

function pendingVerificationEmail(){
  return localStorage.getItem(BHATTI_PENDING_EMAIL_KEY)||'';
}

function rememberPendingVerification(email){
  if(email)localStorage.setItem(BHATTI_PENDING_EMAIL_KEY,email.trim().toLowerCase());
}

function clearPendingVerification(){
  localStorage.removeItem(BHATTI_PENDING_EMAIL_KEY);
}

function updateAuthUI(){
  const signup=BHATTI.authMode==='signup';
  const title=document.getElementById('authTitle');
  const intro=document.getElementById('authIntro');
  const submit=document.getElementById('authSubmit');
  const name=document.getElementById('authNameField');
  const confirm=document.getElementById('authConfirmField');
  const nameInput=document.getElementById('authName');
  const confirmInput=document.getElementById('authConfirm');
  const switcher=document.getElementById('authSwitch');
  if(!title)return;
  title.textContent=signup?'Create your BHATTI account.':'Welcome back.';
  intro.textContent=signup?'Enter your details, then verify your email to activate your private BHATTI account.':'Sign in to save your bag and keep your orders together.';
  submit.textContent=signup?'Continue to verification ↗':'Sign in ↗';
  name.hidden=!signup;
  confirm.hidden=!signup;
  if(nameInput)nameInput.required=signup;
  if(confirmInput)confirmInput.required=signup;
  switcher.innerHTML=signup?'Already verified? <button type="button" onclick="toggleAuthMode()">Sign in</button>':'New to BHATTI? <button type="button" onclick="toggleAuthMode()">Create an account</button>';
}

function openAuth(mode='signin'){
  BHATTI.authMode=mode;
  updateAuthUI();
  document.getElementById('authModal')?.classList.add('open');
  document.body.classList.add('lock');
  setTimeout(()=>document.getElementById('authEmail')?.focus(),80);
}

function closeAuth(){
  document.getElementById('authModal')?.classList.remove('open');
  if(!document.querySelector('.modal-layer.open,.checkout-modal.open,.bag-drawer.open,.site-notice-layer.open'))document.body.classList.remove('lock');
}

function toggleAuthMode(){
  BHATTI.authMode=BHATTI.authMode==='signin'?'signup':'signin';
  updateAuthUI();
}

function setPendingStatus(message,tone=''){
  const status=document.getElementById('pendingVerificationStatus');
  if(!status)return;
  status.textContent=message||'';
  status.className='verification-pending-status'+(tone?` is-${tone}`:'');
}

function startVerificationCooldown(seconds=45){
  const button=document.getElementById('resendVerificationButton');
  if(!button)return;
  clearInterval(verificationCooldownTimer);
  let remaining=seconds;
  button.disabled=true;
  button.textContent=`Resend available in ${remaining}s`;
  verificationCooldownTimer=setInterval(()=>{
    remaining-=1;
    if(remaining<=0){
      clearInterval(verificationCooldownTimer);
      verificationCooldownTimer=null;
      button.disabled=false;
      button.textContent='Resend verification email';
      return;
    }
    button.textContent=`Resend available in ${remaining}s`;
  },1000);
}

function openVerificationPending(email=pendingVerificationEmail()){
  const normalized=String(email||'').trim().toLowerCase();
  if(normalized)rememberPendingVerification(normalized);
  closeAuth();
  const modal=document.getElementById('verificationPendingModal');
  if(!modal)return;
  const address=document.getElementById('pendingVerificationEmail');
  if(address)address.textContent=normalized||'your email address';
  setPendingStatus('The link can take a moment to arrive. Check spam or promotions too.');
  modal.classList.add('open');
  document.body.classList.add('lock');
  startVerificationCooldown();
  setTimeout(()=>document.getElementById('resendVerificationButton')?.focus(),80);
}

function closeVerificationPending(){
  document.getElementById('verificationPendingModal')?.classList.remove('open');
  clearInterval(verificationCooldownTimer);
  verificationCooldownTimer=null;
  if(!document.querySelector('.modal-layer.open,.checkout-modal.open,.bag-drawer.open,.site-notice-layer.open'))document.body.classList.remove('lock');
}

function changeRegistrationEmail(){
  closeVerificationPending();
  openAuth('signup');
  const email=document.getElementById('authEmail');
  if(email){email.value='';email.focus();}
  document.getElementById('authPassword').value='';
  document.getElementById('authConfirm').value='';
}

async function resendVerificationEmail(){
  const email=pendingVerificationEmail();
  const button=document.getElementById('resendVerificationButton');
  if(!email){changeRegistrationEmail();return;}
  button.disabled=true;
  button.textContent='Sending…';
  setPendingStatus('Requesting a fresh secure link…');
  try{
    const{error}=await BHATTI.db.auth.resend({type:'signup',email,options:{emailRedirectTo:BHATTI_EMAIL_CONFIRMATION_URL}});
    if(error)throw error;
    setPendingStatus('A fresh verification email was sent. Use the newest link in your inbox.','success');
    startVerificationCooldown(60);
  }catch(error){
    setPendingStatus(error.message||'The verification email could not be resent. Please try again.','error');
    button.disabled=false;
    button.textContent='Try resending again';
  }
}

async function handleAuth(event){
  event.preventDefault();
  const authForm=event.currentTarget?.closest?.('form')||event.target?.closest?.('form')||document.getElementById('authForm');
  const email=document.getElementById('authEmail').value.trim().toLowerCase();
  const password=document.getElementById('authPassword').value;
  const name=document.getElementById('authName').value.trim();
  const confirm=document.getElementById('authConfirm').value;
  const button=document.getElementById('authSubmit');
  if(BHATTI.authMode==='signup'&&(!name||password!==confirm)){
    BHATTI.notice({eyebrow:'Account details',title:!name?'Enter your full name.':'Passwords do not match.',message:!name?'Your name helps us keep delivery and order details clear.':'Re-enter the same password in both fields.',tone:'error',action:'Review details'});
    return;
  }
  button.disabled=true;
  button.textContent=BHATTI.authMode==='signup'?'Preparing verification…':'Signing in…';
  try{
    if(BHATTI.authMode==='signup'){
      const{data,error}=await BHATTI.db.auth.signUp({email,password,options:{data:{full_name:name},emailRedirectTo:BHATTI_EMAIL_CONFIRMATION_URL}});
      if(error)throw error;
      if(!data.session||!isVerifiedUser(data.user)){
        rememberPendingVerification(email);
        if(authForm&&typeof authForm.reset==='function')authForm.reset();
        openVerificationPending(email);
        return;
      }
      clearPendingVerification();
      closeAuth();
      return;
    }
    const{data,error}=await BHATTI.db.auth.signInWithPassword({email,password});
    if(error)throw error;
    if(!isVerifiedUser(data.user)){
      rememberPendingVerification(email);
      await BHATTI.db.auth.signOut();
      openVerificationPending(email);
      return;
    }
    clearPendingVerification();
    closeAuth();
    const profile=await BHATTI.ensureProfile();
    if(profile?.role==='super_admin'){
      window.location.assign('super-admin-store.html');
      return;
    }
    if(profile?.role==='admin'){
      window.location.assign('admin-store.html');
      return;
    }
  }catch(error){
    if(/email[^.]*not confirmed|confirm[^.]*email/i.test(error.message||'')){
      rememberPendingVerification(email);
      openVerificationPending(email);
    }else{
      BHATTI.notice({eyebrow:'Account access',title:'We could not complete that request.',message:error.message||'Authentication failed. Please try again.',tone:'error',action:'Try again'});
    }
  }finally{
    button.disabled=false;
    updateAuthUI();
  }
}

BHATTI.ensureProfile=async function(){
  if(!BHATTI.currentUser)return null;
  if(!isVerifiedUser(BHATTI.currentUser))throw new Error('Verify your email before activating your BHATTI profile.');
  for(let attempt=0;attempt<5;attempt+=1){
    const{data,error}=await BHATTI.db.from('profiles').select('*').eq('id',BHATTI.currentUser.id).maybeSingle();
    if(error)throw error;
    if(data){BHATTI.profile=data;return data;}
    await new Promise(resolve=>setTimeout(resolve,120*(attempt+1)));
  }
  throw new Error('Your verified profile is still being prepared. Refresh the page in a moment.');
};

function renderAccountHeader(){
  document.querySelectorAll('.account-button').forEach(button=>{
    button.title=BHATTI.currentUser?'My Account':'Sign in / Create account';
    button.classList.toggle('is-signed-in',!!BHATTI.currentUser);
  });
}

function initials(value){return String(value||'BHATTI').trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase()||'L';}
function showInlineMessage(id,text){const box=document.getElementById(id);if(!box)return;box.textContent=text;box.hidden=false;setTimeout(()=>box.hidden=true,2600);}

function populateProfileForm(){
  const profile=BHATTI.profile||{},registered=BHATTI.currentUser?.email||profile.email||'',name=profile.full_name||registered.split('@')[0]||'BHATTI member',contact=registered;
  document.getElementById('profileEmail').value=registered;
  document.getElementById('profileName').value=profile.full_name||'';
  document.getElementById('contactRegisteredEmail').value=registered;
  document.getElementById('contactEmail').value=contact;
  document.getElementById('contactPhone').value=profile.phone||'';
  document.getElementById('accountIdentity').textContent=name+' · '+registered;
  document.getElementById('accountMemberName').textContent=name;
  document.getElementById('accountMemberEmail').textContent=registered;
  document.getElementById('accountAvatar').textContent=initials(name);
}

function switchAccountSection(name='profile'){
  const valid=['profile','orders','addresses','contact'];
  if(!valid.includes(name))name='profile';
  document.querySelectorAll('[data-account-section]').forEach(button=>button.classList.toggle('active',button.dataset.accountSection===name));
  document.querySelectorAll('[data-account-panel]').forEach(panel=>{const active=panel.dataset.accountPanel===name;panel.hidden=!active;panel.classList.toggle('active',active);});
  if(name==='orders')loadMyOrders();
  if(name==='addresses'&&window.loadDeliveryAddresses)loadDeliveryAddresses({seed:true});
}

async function openAccount(section='profile'){
  if(!BHATTI.currentUser){openAuth('signin');return;}
  try{
    await BHATTI.ensureProfile();
    if(['admin','super_admin'].includes(BHATTI.profile?.role)){window.location.replace(BHATTI.profile.role==='super_admin'?'super-admin-store.html':'admin-store.html');return;}
    populateProfileForm();
    document.getElementById('accountModal')?.classList.add('open');
    document.body.classList.add('lock');
    switchAccountSection(section);
    Promise.allSettled([loadMyOrders(),window.loadDeliveryAddresses?loadDeliveryAddresses({seed:true}):Promise.resolve()]);
  }catch(error){
    BHATTI.notice({eyebrow:'My account',title:'Your profile could not be loaded.',message:error.message||'Please try again in a moment.',tone:'error',action:'Close'});
  }
}

function closeAccount(){document.getElementById('accountModal')?.classList.remove('open');if(!document.querySelector('.modal-layer.open,.checkout-modal.open,.bag-drawer.open,.site-notice-layer.open'))document.body.classList.remove('lock');}

async function saveProfile(event){
  event.preventDefault();
  const button=document.getElementById('profileSave');button.disabled=true;button.textContent='Saving…';
  try{
    const payload={full_name:document.getElementById('profileName').value.trim(),updated_at:new Date().toISOString()};
    const{data,error}=await BHATTI.db.from('profiles').update(payload).eq('id',BHATTI.currentUser.id).select('*').single();
    if(error)throw error;
    BHATTI.profile=data;populateProfileForm();showInlineMessage('accountMessage','Profile saved successfully.');
  }catch(error){BHATTI.notice({eyebrow:'My profile',title:'Your profile was not saved.',message:error.message||'Please review your details and try again.',tone:'error',action:'Review profile'});}
  finally{button.disabled=false;button.textContent='Save profile';}
}

async function saveContactInfo(event){
  event.preventDefault();
  const button=document.getElementById('contactSave'),phone=document.getElementById('contactPhone').value.trim();
  if(!phone){BHATTI.notice({eyebrow:'Contact info',title:'Complete your contact details.',message:'Add a phone or WhatsApp number for delivery contact.',tone:'error',action:'Review details'});return;}
  button.disabled=true;button.textContent='Saving…';
  try{
    const{data,error}=await BHATTI.db.from('profiles').update({phone,updated_at:new Date().toISOString()}).eq('id',BHATTI.currentUser.id).select('*').single();
    if(error)throw error;
    BHATTI.profile=data;populateProfileForm();showInlineMessage('contactMessage','Contact information saved.');
  }catch(error){BHATTI.notice({eyebrow:'Contact info',title:'Contact details were not saved.',message:error.message||'Please try again.',tone:'error',action:'Review details'});}
  finally{button.disabled=false;button.textContent='Save contact info';}
}

async function signOutCustomer(){await BHATTI.db.auth.signOut();closeAccount();}

async function handleSession(session){
  if(session?.user&&!isVerifiedUser(session.user)){
    const email=session.user.email||pendingVerificationEmail();
    BHATTI.currentUser=null;BHATTI.profile=null;BHATTI.addresses=[];renderAccountHeader();rememberPendingVerification(email);
    await BHATTI.db.auth.signOut();await BHATTI.loadCart();openVerificationPending(email);return;
  }
  BHATTI.currentUser=session?.user||null;BHATTI.profile=null;BHATTI.addresses=[];renderAccountHeader();
  if(BHATTI.currentUser){
    clearPendingVerification();
    try{await BHATTI.ensureProfile();
      if(['admin','super_admin'].includes(BHATTI.profile?.role) && (/\/index\.html$/.test(window.location.pathname) || /\/$/.test(window.location.pathname))){
        window.location.replace(BHATTI.profile.role==='super_admin'?'super-admin-store.html':'admin-store.html');
        return;
      }
      if(['admin','super_admin'].includes(BHATTI.profile?.role)) return;
      await BHATTI.loadCart({mergeGuest:true});window.render?.();}
    catch(error){console.warn('Account setup failed',error);await BHATTI.loadCart();}
  }else await BHATTI.loadCart();
}

function handleAuthReturn(session){
  const url=new URL(window.location.href),hash=new URLSearchParams(url.hash.replace(/^#/,''));
  const error=url.searchParams.get('error_description')||hash.get('error_description');
  const verified=url.searchParams.get('verified')==='1';
  const legacyConfirmation=url.searchParams.get('auth')==='confirmed'||hash.get('type')==='signup';
  const requestSignIn=url.searchParams.get('auth')==='signin';
  if(requestSignIn)openAuth('signin');
  if(error)BHATTI.notice({eyebrow:'Email confirmation',title:'This confirmation link could not be completed.',message:error.replace(/\+/g,' ')+'. Request a fresh verification email and use the newest link.',tone:'error',action:'Try again'});
  else if((verified||legacyConfirmation)&&session)BHATTI.notice({eyebrow:'Email verified',title:'Your BHATTI account is ready.',message:'Your verified profile is active. Your bag, saved addresses and order history can now stay together.',tone:'success',action:'Start shopping'});
  else if(legacyConfirmation&&!session)BHATTI.notice({eyebrow:'Email confirmation',title:'Your link was opened, but sign-in did not finish.',message:'The link may have expired. Sign in or request a fresh verification email.',tone:'error',action:'Continue'});
  ['auth','verified','error','error_code','error_description'].forEach(key=>url.searchParams.delete(key));
  url.hash='';window.history.replaceState({},document.title,url.pathname+(url.search||''));
}

async function initAuth(){
  BHATTI.authMode='signin';updateAuthUI();
  document.querySelectorAll('[data-account-section]').forEach(button=>button.addEventListener('click',()=>switchAccountSection(button.dataset.accountSection)));
  const{data:{session}}=await BHATTI.db.auth.getSession();
  await handleSession(session);handleAuthReturn(session);
  BHATTI.db.auth.onAuthStateChange((_event,newSession)=>setTimeout(()=>handleSession(newSession),0));
}

document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&document.getElementById('accountModal')?.classList.contains('open'))closeAccount();
  if(event.key==='Escape'&&document.getElementById('verificationPendingModal')?.classList.contains('open'))closeVerificationPending();
});

BHATTI.EMAIL_CONFIRMATION_URL=BHATTI_EMAIL_CONFIRMATION_URL;
BHATTI.isVerifiedUser=isVerifiedUser;
window.openAuth=openAuth;window.closeAuth=closeAuth;window.toggleAuthMode=toggleAuthMode;window.handleAuth=handleAuth;
window.openVerificationPending=openVerificationPending;window.closeVerificationPending=closeVerificationPending;window.changeRegistrationEmail=changeRegistrationEmail;window.resendVerificationEmail=resendVerificationEmail;
window.openAccount=openAccount;window.closeAccount=closeAccount;window.switchAccountSection=switchAccountSection;window.saveProfile=saveProfile;window.saveContactInfo=saveContactInfo;window.signOutCustomer=signOutCustomer;window.initAuth=initAuth;
