import { supabase } from "./supabaseClient.js";

const db=supabase;
const $=id=>document.getElementById(id);
let sessionUser=null;
let role=null;
let fullName="";
let email="";

async function getRole(){
  const {data:{user}={},error}=await db.auth.getUser();
  if(error||!user)return {user:null,role:null};
  const {data:profile,error:profileError}=await db.from("profiles").select("role,full_name").eq("id",user.id).maybeSingle();
  if(profileError)throw profileError;
  return {user,role:profile?.role||null,full_name:profile?.full_name||user.email||"",email:user.email||""};
}

function setProfileModal(){
  const superAdmin=role==="super_admin";
  const studioHref=superAdmin?"super-admin.html":"admin/index.html";
  $("previewStudioLink").textContent=superAdmin?"Super Admin Studio ↗":"Admin Studio ↗";
  $("previewStudioLink").href=studioHref;
  $("previewStudioButton").onclick=()=>window.location.href=studioHref;
  $("previewFooterStudio").textContent=superAdmin?"Open Super Admin Studio ↗":"Open Admin Studio ↗";
  $("previewFooterStudio").href=studioHref;
  $("previewRolePill").textContent=superAdmin?"SUPER ADMIN PREVIEW":"ADMIN PREVIEW";
  $("previewProfileTitle").textContent=fullName||"Administrator";
  $("previewProfileBody").textContent=`Email: ${email}\nRole: ${superAdmin?"Super Admin":"Admin"}\nAdmin ID: ${sessionUser?.id||"Unavailable"}`;
  $("previewProfileStudio").textContent=superAdmin?"Open Super Admin Studio ↗":"Open Admin Studio ↗";
  $("previewProfileStudio").href=studioHref;
}
window.openPreviewProfile=()=>openProfile();
function openProfile(){ $("previewProfileModal").classList.add("open"); $("previewProfileModal").setAttribute("aria-hidden","false"); document.body.classList.add("lock"); }
function closeProfile(){ $("previewProfileModal").classList.remove("open"); $("previewProfileModal").setAttribute("aria-hidden","true"); document.body.classList.remove("lock"); }
async function signOut(){const {error}=await db.auth.signOut();if(error){alert(error.message);return;}window.location.replace("index.html?auth=signin");}

async function init(){
  try{
    const result=await getRole();
    sessionUser=result.user;role=result.role;fullName=result.full_name;email=result.email;
    if(!sessionUser){window.location.replace("index.html?auth=signin");return;}
    if(!["admin","super_admin"].includes(role)){window.location.replace("index.html");return;}
    BHATTI.profile={role,full_name:fullName,email};
    BHATTI.currentUser=sessionUser;
    BHATTI.db=db;
    BHATTI.previewMode=true;
    window.addQuantity=async()=>{openProfile();return false;};
    window.openCheckout=async()=>{openProfile();return false;};
    setProfileModal();
    const studioTarget=role==="super_admin"?"super-admin.html":"admin/index.html";
    const studioLink=$("previewStudioLink");
    if(studioLink){studioLink.href=studioTarget;studioLink.textContent=role==="super_admin"?"Super Admin Studio ↗":"Admin Studio ↗";}
    const studioButton=$("previewStudioButton");
    if(studioButton){studioButton.type="button";studioButton.onclick=event=>{event.preventDefault();window.location.assign(studioTarget);};}
    document.addEventListener("click",event=>{
      const account=event.target.closest("#previewAccountButton");
      const studio=event.target.closest("#previewStudioButton");
      if(account){event.preventDefault();event.stopPropagation();openProfile();}
      if(studio){event.preventDefault();event.stopPropagation();window.location.assign(studioTarget);}
    },true);
    const profileButton=$("previewAccountButton");
    if(profileButton){
      profileButton.onclick=null;
      profileButton.addEventListener("click",event=>{event.preventDefault();event.stopImmediatePropagation();openProfile();},true);
    }
    $("previewFooterProfile").onclick=event=>{event.preventDefault();openProfile();};
    $("previewSupport").onclick=openProfile;
    $("previewProfileClose").onclick=closeProfile;
    $("previewProfileModal").addEventListener("click",e=>{if(e.target.id==="previewProfileModal")closeProfile();});
    $("previewProfileLogout").onclick=signOut;
    await loadProducts();
  }catch(error){console.error(error);$("previewProfileBody").textContent=error.message||"Administrative preview could not be verified.";}
}
init();