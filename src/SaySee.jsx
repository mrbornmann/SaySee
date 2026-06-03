import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase connection ───────────────────────────────────────────
const SUPABASE_URL = "https://peuuimpaylmprjrnnkqi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBldXVpbXBheWxtcHJqcm5ua3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDk5MzMsImV4cCI6MjA5NjAyNTkzM30.MBQbempSUsYAWlacXLCqe7qVr6ssA4B4uS5QOiJMaF0";
let supabase = null;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} catch(e) { console.log("Supabase init failed - using local fallback"); }

// ── Auth helpers ──────────────────────────────────────────────────
const sbAuth = {
  signUp: async (email, password, name, plan) => {
    if (!supabase) throw new Error("Not connected");
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, plan, role:"teacher" } } });
    if (error) throw error;
    if (data.user) await supabase.from("accounts").insert({ id:data.user.id, email, name, role:"teacher", created_at:new Date().toISOString() });
    return data;
  },
  signIn: async (email, password) => {
    if (!supabase) throw new Error("Not connected");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await supabase.from("accounts").update({ last_login:new Date().toISOString() }).eq("id", data.user.id);
    return data;
  },
  signOut: async () => { if (supabase) await supabase.auth.signOut(); },
  getSession: async () => { if (!supabase) return null; const { data } = await supabase.auth.getSession(); return data.session; },
  getAccount: async (userId) => { if (!supabase) return null; const { data } = await supabase.from("accounts").select("*").eq("id", userId).single(); return data; }
};

// ── Data helpers ──────────────────────────────────────────────────
const sbData = {
  getStudents: async (tid) => { if (!supabase) return []; const { data } = await supabase.from("students").select("*").eq("teacher_id", tid).order("created_at"); return data||[]; },
  saveStudent: async (s) => { if (!supabase) return s; const { data } = await supabase.from("students").upsert(s).select().single(); return data; },
  deleteStudent: async (id) => { if (supabase) await supabase.from("students").delete().eq("id", id); },
  getProgress: async (sid) => {
    if (!supabase) return {};
    const { data } = await supabase.from("student_progress").select("*").eq("student_id", sid);
    const p = {}; (data||[]).forEach(r=>{ p[r.word_id]=true; }); return p;
  },
  markLearned: async (sid, wid, env="school") => {
    if (!supabase) return;
    await supabase.from("student_progress").upsert({ student_id:sid, word_id:String(wid), learned:true, date_learned:new Date().toISOString(), environment:env, word_source:"master" });
  },
  getWords: async () => { if (!supabase) return []; const { data } = await supabase.from("words").select("*").eq("is_active", true).order("category"); return data||[]; },
  getCustomWords: async (tid) => { if (!supabase) return []; const { data } = await supabase.from("custom_words").select("*").eq("teacher_id", tid); return data||[]; },
  saveCustomWord: async (w) => { if (!supabase) return w; const { data } = await supabase.from("custom_words").insert(w).select().single(); return data; },
  deleteCustomWord: async (id) => { if (supabase) await supabase.from("custom_words").delete().eq("id", id); },
  uploadPhoto: async (tid, wid, sid, dataUrl) => {
    if (!supabase) return null;
    const res = await fetch(dataUrl); const blob = await res.blob();
    const path = `${tid}/${wid}_${sid||"shared"}_${Date.now()}.jpg`;
    await supabase.storage.from("photos").upload(path, blob, { upsert:true });
    const { data } = supabase.storage.from("photos").getPublicUrl(path);
    await supabase.from("photos").upsert({ word_id:String(wid), student_id:sid, teacher_id:tid, storage_url:data.publicUrl });
    return data.publicUrl;
  },
  getPhoto: async (tid, wid) => {
    if (!supabase) return null;
    const { data } = await supabase.from("photos").select("storage_url").eq("teacher_id", tid).eq("word_id", String(wid)).maybeSingle();
    return data?.storage_url||null;
  },
  getDistrictTeachers: async (did) => { if (!supabase) return []; const { data } = await supabase.from("accounts").select("*").eq("district_id", did).eq("role","teacher"); return data||[]; },
  getDistrictStudents: async (did) => { if (!supabase) return []; const { data } = await supabase.from("students").select("*").eq("district_id", did); return data||[]; },
  getLicenses: async (did) => { if (!supabase) return []; const { data } = await supabase.from("licenses").select("*").eq("district_id", did); return data||[]; },
  assignLicense: async (lid, tid) => { if (supabase) await supabase.from("licenses").update({ assigned_to_teacher_id:tid, status:"active", assigned_date:new Date().toISOString() }).eq("id", lid); }
};

// ── In-memory fallback for artifact preview ───────────────────────
let _store = {};
const mem = { get:(k,fb)=>k in _store?_store[k]:fb, set:(k,v)=>{_store[k]=v;} };

// ── Data ─────────────────────────────────────────────────────────
const MASTER_WORDS = [
  {id:1, cat:"core",      word:"stop",       display:"STOP",         emoji:"🛑", photo:"stop sign red street",            color:"#E8484A", triggers:["stop","stop it","freeze"]},
  {id:2, cat:"core",      word:"sit down",   display:"SIT DOWN",     emoji:"🪑", photo:"child sitting chair classroom",    color:"#D63031", triggers:["sit","sit down","have a seat"]},
  {id:3, cat:"core",      word:"line up",    display:"LINE UP",      emoji:"🚶", photo:"children standing in line school", color:"#E17055", triggers:["line up","get in line","lineup"]},
  {id:4, cat:"core",      word:"outside",    display:"OUTSIDE",      emoji:"🌤️",  photo:"children playing outside school",  color:"#00B894", triggers:["outside","go outside"]},
  {id:5, cat:"core",      word:"recess",     display:"RECESS",       emoji:"🛝", photo:"children playground recess",       color:"#00CEC9", triggers:["recess","playground","go to recess"]},
  {id:6, cat:"core",      word:"restroom",   display:"RESTROOM",     emoji:"🚻", photo:"school restroom door sign",        color:"#0984E3", triggers:["restroom","bathroom","go to the bathroom"]},
  {id:7, cat:"core",      word:"snack time", display:"SNACK TIME",   emoji:"🍎", photo:"child eating snack classroom",     color:"#FDCB6E", triggers:["snack","snack time","eat your snack"]},
  {id:8, cat:"core",      word:"lunch time", display:"LUNCH TIME",   emoji:"🥪", photo:"school cafeteria lunch children",  color:"#E67E22", triggers:["lunch","lunch time","time for lunch"]},
  {id:9, cat:"core",      word:"help",       display:"HELP",         emoji:"🤝", photo:"helping hands together",           color:"#A29BFE", triggers:["help","i need help","help me"]},
  {id:10,cat:"core",      word:"done",       display:"DONE",         emoji:"✅", photo:"finished checkmark complete",      color:"#6C5CE7", triggers:["done","all done","finished"]},
  {id:11,cat:"classroom", word:"listen",     display:"LISTEN",       emoji:"👂", photo:"child listening teacher",          color:"#0984E3", triggers:["listen","listen up","pay attention"]},
  {id:12,cat:"classroom", word:"raise hand", display:"RAISE HAND",   emoji:"✋", photo:"student raising hand classroom",   color:"#74B9FF", triggers:["raise your hand","hands up"]},
  {id:13,cat:"classroom", word:"quiet",      display:"QUIET",        emoji:"🤫", photo:"quiet shush finger lips",          color:"#55EFC4", triggers:["quiet","be quiet","shhh"]},
  {id:14,cat:"classroom", word:"walk",       display:"WALK",         emoji:"🚶", photo:"child walking hallway school",     color:"#00B894", triggers:["walk","walking feet"]},
  {id:15,cat:"classroom", word:"clean up",   display:"CLEAN UP",     emoji:"🧹", photo:"children cleaning classroom",      color:"#8E44AD", triggers:["clean up","tidy up","pick up"]},
  {id:16,cat:"classroom", word:"work time",  display:"WORK TIME",    emoji:"📝", photo:"student working desk classroom",   color:"#2C3E50", triggers:["work time","time to work"]},
  {id:17,cat:"library",   word:"reading",    display:"READING TIME", emoji:"📖", photo:"child reading book library",       color:"#8E44AD", triggers:["reading","reading time","story time"]},
  {id:18,cat:"library",   word:"book",       display:"BOOK",         emoji:"📚", photo:"colorful children books shelf",    color:"#9B59B6", triggers:["book","get a book"]},
  {id:19,cat:"library",   word:"sit quietly",display:"SIT QUIETLY",  emoji:"🧘", photo:"child sitting quietly reading",    color:"#6C3483", triggers:["sit quietly","sit quiet"]},
  {id:20,cat:"recess",    word:"play",       display:"PLAY",         emoji:"🎉", photo:"children playing together happy",  color:"#27AE60", triggers:["play","time to play"]},
  {id:21,cat:"recess",    word:"slide",      display:"SLIDE",        emoji:"🛝", photo:"child playground slide",           color:"#2ECC71", triggers:["slide","go down the slide"]},
  {id:22,cat:"recess",    word:"swing",      display:"SWING",        emoji:"🪁", photo:"child on playground swing",        color:"#1E8449", triggers:["swing","swings"]},
  {id:23,cat:"recess",    word:"ball",       display:"BALL",         emoji:"⚽", photo:"colorful playground ball",         color:"#F1C40F", triggers:["ball","kick the ball"]},
  {id:24,cat:"lunch",     word:"breakfast",  display:"BREAKFAST",    emoji:"🥞", photo:"school breakfast tray",            color:"#E67E22", triggers:["breakfast","breakfast time"]},
  {id:25,cat:"lunch",     word:"drink",      display:"DRINK",        emoji:"🥛", photo:"child drinking milk glass",        color:"#F39C12", triggers:["drink","drink your milk"]},
  {id:26,cat:"lunch",     word:"tray",       display:"GET YOUR TRAY",emoji:"🍱", photo:"school lunch tray cafeteria",      color:"#D35400", triggers:["tray","get your tray"]},
  {id:27,cat:"lunch",     word:"sit and eat",display:"SIT AND EAT",  emoji:"🍽️",  photo:"children sitting eating cafeteria",color:"#CA6F1E", triggers:["sit and eat","eat your lunch"]},
  {id:28,cat:"emotions",  word:"happy",      display:"HAPPY",        emoji:"😊", photo:"happy smiling child school",       color:"#F1C40F", triggers:["happy","i'm happy"]},
  {id:29,cat:"emotions",  word:"sad",        display:"SAD",          emoji:"😢", photo:"sad child looking down",           color:"#5DADE2", triggers:["sad","i'm sad"]},
  {id:30,cat:"emotions",  word:"angry",      display:"ANGRY",        emoji:"😠", photo:"frustrated child",                 color:"#E74C3C", triggers:["angry","mad","i'm mad"]},
  {id:31,cat:"emotions",  word:"calm down",  display:"CALM DOWN",    emoji:"🌬️",  photo:"child calm breathing peaceful",    color:"#85C1E9", triggers:["calm down","breathe","calm"]},
  {id:32,cat:"emotions",  word:"scared",     display:"SCARED",       emoji:"😨", photo:"scared worried child",             color:"#7F8C8D", triggers:["scared","afraid"]},
  {id:33,cat:"emotions",  word:"excited",    display:"EXCITED",      emoji:"🤩", photo:"excited happy jumping child",      color:"#F39C12", triggers:["excited","i'm excited"]},
  {id:34,cat:"actions",   word:"stand up",   display:"STAND UP",     emoji:"🧍", photo:"child standing up classroom",      color:"#1ABC9C", triggers:["stand","stand up","get up"]},
  {id:35,cat:"actions",   word:"look",       display:"LOOK",         emoji:"👀", photo:"child looking pointing",           color:"#16A085", triggers:["look","look here","eyes on me"]},
  {id:36,cat:"actions",   word:"wait",       display:"WAIT",         emoji:"⏳", photo:"child waiting patiently",          color:"#2ECC71", triggers:["wait","please wait","hold on"]},
  {id:37,cat:"actions",   word:"come here",  display:"COME HERE",    emoji:"👋", photo:"teacher waving child come",        color:"#27AE60", triggers:["come here","come to me"]},
  {id:38,cat:"actions",   word:"go",         display:"GO",           emoji:"🚦", photo:"green traffic light go",           color:"#2ECC71", triggers:["go","let's go","go ahead"]},
  {id:39,cat:"actions",   word:"try again",  display:"TRY AGAIN",    emoji:"🔄", photo:"child trying again",               color:"#1ABC9C", triggers:["try again","let's try again"]},
];

const CATS = [
  {id:"core",      label:"Core",        icon:"⭐", color:"#E8484A"},
  {id:"classroom", label:"Classroom",   icon:"🏫", color:"#0984E3"},
  {id:"library",   label:"Library",     icon:"📚", color:"#8E44AD"},
  {id:"recess",    label:"Recess",      icon:"⚽", color:"#27AE60"},
  {id:"lunch",     label:"Lunch",       icon:"🍽️",  color:"#E67E22"},
  {id:"emotions",  label:"Emotions",    icon:"😊", color:"#F1C40F"},
  {id:"actions",   label:"Actions",     icon:"🏃", color:"#1ABC9C"},
  {id:"custom",    label:"My Words",    icon:"✏️",  color:"#95A5A6"},
];

const LEVELS = [
  {id:1,label:"Photo",    icon:"📷"},
  {id:2,label:"Color Art",icon:"🎨"},
  {id:3,label:"B&W Art",  icon:"✏️"},
  {id:4,label:"Word Only",icon:"🔤"},
];

const AVATARS = ["🐱","🐶","🐸","🦊","🐼","🐨","🦁","🐯","🦄","🐙","🦋","🐬","🦉","🐻","🐺"];

const DEMO_ACCOUNTS = [
  {id:"admin", email:"admin@saysee.app",  password:"saysee2024!", name:"SaySee Admin",  role:"admin"},
  {id:"demo",  email:"teacher@demo.com",  password:"demo123",     name:"Ms. Johnson",   role:"teacher", plan:"monthly", maxStudents:28},
];

const DEMO_STUDENTS = [
  {id:"s1", name:"Alex R.",   avatar:"🐱", color:"#0984E3", level:1, progress:{},                  sharedWith:[]},
  {id:"s2", name:"Maya T.",   avatar:"🦊", color:"#8E44AD", level:2, progress:{1:true,2:true,5:true},sharedWith:[]},
  {id:"s3", name:"Jordan K.", avatar:"🐸", color:"#27AE60", level:1, progress:{},                  sharedWith:[]},
];

// Photos are stored as base64 data URLs in mem store, keyed by word id
// No external image service needed — all royalty-free because teachers take them
function getWordPhoto(wordId){ return mem.get(`photo_${wordId}`, null); }
function setWordPhoto(wordId, dataUrl){ mem.set(`photo_${wordId}`, dataUrl); }

function readFileAsDataURL(file){
  return new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=e=>res(e.target.result);
    r.onerror=rej;
    r.readAsDataURL(file);
  });
}

// ── Tiny shared UI ────────────────────────────────────────────
function Btn({children,onClick,color="#0984E3",outline,danger,full,disabled,small,style={}}){
  const bg=outline?"transparent":danger?"#E74C3C":color;
  const fc=outline?(danger?"#E74C3C":color):"#fff";
  return(
    <button onClick={onClick} disabled={disabled} style={{
      background:bg,color:fc,border:outline?`2px solid ${danger?"#E74C3C":color}`:"none",
      borderRadius:12,padding:small?"7px 14px":"12px 22px",
      fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:small?13:15,
      cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,
      width:full?"100%":undefined,
      boxShadow:outline||disabled?"none":`0 4px 16px ${bg}55`,
      transition:"all 0.2s",...style
    }}>{children}</button>
  );
}

function Field({label,value,onChange,type="text",placeholder=""}){
  return(
    <div style={{marginBottom:15}}>
      {label&&<div style={{fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:12,color:"#666",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5}}>{label}</div>}
      <input value={value} onChange={e=>onChange(e.target.value)} type={type} placeholder={placeholder}
        style={{width:"100%",padding:"11px 14px",border:"2px solid #E8ECF0",borderRadius:12,fontSize:15,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box",background:"#FAFBFC"}}/>
    </div>
  );
}

function Modal({children,onClose}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,10,30,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,backdropFilter:"blur(6px)"}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:24,padding:28,width:"min(94vw,420px)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.3)",animation:"popIn 0.3s cubic-bezier(.34,1.56,.64,1)"}} onClick={e=>e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function MH({children}){
  return <div style={{fontFamily:"'Fredoka One',cursive",fontSize:21,color:"#1A1A2E",marginBottom:20}}>{children}</div>;
}

// ── Photo upload button (shown on word chips when no photo exists) ──
function PhotoUploadPrompt({entry, onPhotoSaved}){
  const inputRef=useRef(null);
  const [saving,setSaving]=useState(false);

  const handleFile=async(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    setSaving(true);
    try{
      const dataUrl=await readFileAsDataURL(file);
      setWordPhoto(entry.id, dataUrl);
      onPhotoSaved(entry.id, dataUrl);
    }catch(err){console.error(err);}
    setSaving(false);
    e.target.value="";
  };

  return(
    <>
      <input ref={inputRef} type="file" accept="image/*" capture="environment"
        onChange={handleFile} style={{display:"none"}}/>
      <button onClick={()=>inputRef.current?.click()} style={{
        display:"flex",alignItems:"center",gap:6,padding:"7px 14px",
        borderRadius:30,border:`2px dashed ${entry.color}`,
        background:`${entry.color}10`,color:entry.color,
        fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,
        cursor:"pointer",transition:"all 0.2s"
      }}>
        {saving?"⏳ Saving…":"📸 Add Photo"}
      </button>
    </>
  );
}

// ── Word card ─────────────────────────────────────────────────
function WordCard({entry, level, photoOverride, onRequestPhoto}){
  const [ok,setOk]=useState(false);
  const storedPhoto = photoOverride || getWordPhoto(entry.id);
  useEffect(()=>{setOk(false);},[entry.id, level, storedPhoto]);

  if(level===4) return(
    <div style={{animation:"popIn 0.5s cubic-bezier(.34,1.56,.64,1)",textAlign:"center",padding:"0 16px"}}>
      <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"clamp(60px,13vw,120px)",color:entry.color,lineHeight:1.05,textShadow:`0 6px 32px ${entry.color}55`,letterSpacing:2}}>{entry.display}</div>
    </div>
  );

  const boxSize="min(70vw,400px)";
  const box={width:boxSize,height:boxSize,borderRadius:28,overflow:"hidden",position:"relative",boxShadow:`0 12px 50px ${entry.color}55`,animation:"popIn 0.5s cubic-bezier(.34,1.56,.64,1)"};

  if(level===1){
    // No photo yet — show prompt
    if(!storedPhoto) return(
      <div style={{...box,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        background:`${entry.color}10`,border:`3px dashed ${entry.color}66`,gap:16}}>
        <div style={{fontSize:80,lineHeight:1}}>{entry.emoji}</div>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:18,color:entry.color,textAlign:"center",padding:"0 20px"}}>
          Add a real photo!
        </div>
        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#888",textAlign:"center",padding:"0 24px",lineHeight:1.5}}>
          Take a photo of your classroom's actual {entry.word.toLowerCase()} for the best learning experience
        </div>
        {onRequestPhoto&&(
          <button onClick={onRequestPhoto} style={{
            padding:"10px 22px",borderRadius:30,border:"none",
            background:entry.color,color:"#fff",
            fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:14,
            cursor:"pointer",boxShadow:`0 4px 16px ${entry.color}55`
          }}>📸 Take / Upload Photo</button>
        )}
      </div>
    );

    // Has photo
    return(
      <div style={box}>
        {!ok&&<div style={{position:"absolute",inset:0,background:"#F0F3F7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:48}}>✨</div>}
        <img src={storedPhoto} alt={entry.word}
          onLoad={()=>setOk(true)}
          style={{width:"100%",height:"100%",objectFit:"cover",opacity:ok?1:0,transition:"opacity 0.4s"}}/>
      </div>
    );
  }

  // Levels 2 & 3 — emoji art (no photo needed)
  return(
    <div style={{...box,display:"flex",alignItems:"center",justifyContent:"center",background:level===2?`${entry.color}14`:"#F4F5F7"}}>
      <div style={{fontSize:180,lineHeight:1,filter:level===3?"grayscale(100%) contrast(0.55)":"none",transition:"filter 0.4s"}}>{entry.emoji}</div>
    </div>
  );
}

// ── Student display mode (full screen) ───────────────────────
function StudentMode({entry,level,listening,transcript,onExit}){
  const [taps,setTaps]=useState(0);
  const timer=useRef(null);
  const handleTap=()=>{
    setTaps(n=>n+1);
    clearTimeout(timer.current);
    timer.current=setTimeout(()=>setTaps(0),800);
  };
  useEffect(()=>{if(taps>=3){setTaps(0);onExit();}},[taps]);

  return(
    <div onClick={handleTap} style={{position:"fixed",inset:0,background:entry?"#FFFFFF":"#0F0C29",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24,zIndex:100,userSelect:"none"}}>
      <div style={{position:"absolute",top:16,right:18,display:"flex",alignItems:"center",gap:6}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:listening?"#2ECC71":"#BDC3C7",animation:listening?"mPulse 1.8s ease-in-out infinite":"none"}}/>
        <span style={{fontFamily:"'Nunito',sans-serif",fontSize:11,fontWeight:700,color:listening?"#2ECC71":"#BDC3C7",textTransform:"uppercase",letterSpacing:0.8}}>{listening?"Listening":"Mic off"}</span>
      </div>

      {entry?(
        <>
          <WordCard entry={entry} level={level} photoOverride={getWordPhoto(entry?.id)}/>
          {level<4&&<div style={{fontFamily:"'Fredoka One',cursive",fontSize:"clamp(30px,8vw,58px)",color:entry.color,letterSpacing:2,textShadow:`0 3px 14px ${entry.color}44`,animation:"fadeUp 0.4s ease"}}>{entry.display}</div>}
        </>
      ):(
        <div style={{textAlign:"center",opacity:0.3}}>
          <div style={{fontSize:86,marginBottom:14}}>👁️</div>
          <div style={{fontFamily:"'Fredoka One',cursive",fontSize:26,color:"#fff"}}>SaySee</div>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:15,color:"#fff",marginTop:8}}>{listening?"Listening for a word…":"Tap mic to start"}</div>
        </div>
      )}

      {transcript&&<div style={{position:"absolute",bottom:20,fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#AAA",fontStyle:"italic"}}>"{transcript}"</div>}
      <div style={{position:"absolute",bottom:6,left:"50%",transform:"translateX(-50%)",fontSize:10,color:"#DDD",opacity:0.35,fontFamily:"'Nunito',sans-serif"}}>triple-tap anywhere to exit</div>
    </div>
  );
}

// ── Auth screen ───────────────────────────────────────────────
function AuthScreen({accounts,onLogin,onRegister}){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [name,setName]=useState("");
  const [plan,setPlan]=useState("monthly");
  const [err,setErr]=useState("");

  const iStyle={width:"100%",padding:"12px 16px",borderRadius:12,border:"2px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.08)",color:"#fff",fontSize:15,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"};
  const lStyle={fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block",fontFamily:"'Nunito',sans-serif"};

  const doLogin=async()=>{
    setErr("");
    await onLogin(email, pass, setErr);
  };
  const doNext=()=>{
    setErr("");
    if(!name||!email||!pass){setErr("All fields required.");return;}
    if(pass.length<6){setErr("Password needs 6+ characters.");return;}
    setMode("plan");
  };
  const doCreate=async()=>{
    setErr("");
    await onRegister(name, email, pass, plan, setErr);
  };

  const plans=[
    {id:"monthly",label:"Monthly",   price:"$28/mo",  sub:"Up to 28 students · Cancel anytime",color:"#0984E3"},
    {id:"annual", label:"Annual",    price:"$252/yr", sub:"Save 25% · Up to 28 students",       color:"#8E44AD",badge:"BEST VALUE"},
    {id:"school", label:"School Site",price:"Custom", sub:"Multiple classrooms · Contact us",   color:"#27AE60"},
  ];

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0F0C29,#302B63,#24243E)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"min(94vw,440px)"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontFamily:"'Fredoka One',cursive",fontSize:46,color:"#fff",letterSpacing:2}}>👁️ SaySee</div>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"rgba(255,255,255,0.5)",letterSpacing:1,textTransform:"uppercase"}}>AAC Visual Learning</div>
        </div>
        <div style={{background:"rgba(255,255,255,0.07)",backdropFilter:"blur(20px)",borderRadius:24,padding:28,border:"1px solid rgba(255,255,255,0.12)"}}>

          {mode==="login"&&<>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:23,color:"#fff",marginBottom:22}}>Welcome back</div>
            {[["Email","email",email,setEmail,"you@school.edu"],["Password","password",pass,setPass,"••••••••"]].map(([l,t,v,s,p])=>(
              <div key={l} style={{marginBottom:13}}><label style={lStyle}>{l}</label><input value={v} onChange={e=>s(e.target.value)} type={t} placeholder={p} style={iStyle}/></div>
            ))}
            {err&&<div style={{color:"#FF7675",fontSize:13,marginBottom:10,fontFamily:"'Nunito',sans-serif"}}>{err}</div>}
            <button onClick={doLogin} style={{width:"100%",padding:"13px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#0984E3,#6C5CE7)",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:16,cursor:"pointer",boxShadow:"0 6px 24px rgba(9,132,227,0.45)",marginBottom:14}}>Sign In</button>
            <div style={{textAlign:"center",fontFamily:"'Nunito',sans-serif",fontSize:14,color:"rgba(255,255,255,0.45)"}}>
              No account? <span onClick={()=>{setErr("");setMode("register");}} style={{color:"#74B9FF",cursor:"pointer",fontWeight:800}}>Sign up</span>
            </div>
            <div style={{textAlign:"center",marginTop:10,fontFamily:"'Nunito',sans-serif",fontSize:11,color:"rgba(255,255,255,0.25)"}}>Demo: teacher@demo.com / demo123 &nbsp;|&nbsp; admin@saysee.app / saysee2024!</div>
          </>}

          {mode==="register"&&<>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:23,color:"#fff",marginBottom:22}}>Create account</div>
            {[["Name","text",name,setName,"Your full name"],["Email","email",email,setEmail,"you@school.edu"],["Password","password",pass,setPass,"6+ characters"]].map(([l,t,v,s,p])=>(
              <div key={l} style={{marginBottom:13}}><label style={lStyle}>{l}</label><input value={v} onChange={e=>s(e.target.value)} type={t} placeholder={p} style={iStyle}/></div>
            ))}
            {err&&<div style={{color:"#FF7675",fontSize:13,marginBottom:10,fontFamily:"'Nunito',sans-serif"}}>{err}</div>}
            <button onClick={doNext} style={{width:"100%",padding:"13px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#00B894,#0984E3)",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:16,cursor:"pointer",boxShadow:"0 6px 24px rgba(0,184,148,0.4)",marginBottom:14}}>Continue to Plan</button>
            <div style={{textAlign:"center",fontFamily:"'Nunito',sans-serif",fontSize:14,color:"rgba(255,255,255,0.45)"}}>
              Have an account? <span onClick={()=>{setErr("");setMode("login");}} style={{color:"#74B9FF",cursor:"pointer",fontWeight:800}}>Sign in</span>
            </div>
          </>}

          {mode==="plan"&&<>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:21,color:"#fff",marginBottom:5}}>Choose your plan</div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"rgba(255,255,255,0.45)",marginBottom:20}}>14-day free trial. Cancel anytime.</div>
            {plans.map(p=>(
              <div key={p.id} onClick={()=>setPlan(p.id)} style={{padding:"14px 16px",borderRadius:14,marginBottom:10,cursor:"pointer",background:plan===p.id?`${p.color}22`:"rgba(255,255,255,0.04)",border:`2px solid ${plan===p.id?p.color:"rgba(255,255,255,0.1)"}`,transition:"all 0.2s",position:"relative"}}>
                {p.badge&&<div style={{position:"absolute",top:-8,right:10,background:p.color,color:"#fff",fontSize:9,fontWeight:900,padding:"2px 8px",borderRadius:20,fontFamily:"'Nunito',sans-serif",letterSpacing:1}}>{p.badge}</div>}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:15,color:"#fff"}}>{p.label}</div>
                  <div style={{fontFamily:"'Fredoka One',cursive",fontSize:18,color:p.color}}>{p.price}</div>
                </div>
                <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:2}}>{p.sub}</div>
              </div>
            ))}
            <button onClick={doCreate} style={{width:"100%",padding:"13px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#0984E3,#6C5CE7)",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:16,cursor:"pointer",boxShadow:"0 6px 24px rgba(9,132,227,0.45)",marginTop:6}}>Start 14-Day Free Trial</button>
          </>}
        </div>
      </div>
    </div>
  );
}

// ── Admin panel ───────────────────────────────────────────────
function AdminPanel({words,setWords,onLogout}){
  const [tab,setTab]=useState("words");
  const [editW,setEditW]=useState(null);
  const [addW,setAddW]=useState(false);
  const [cat,setCat]=useState("all");

  const shown=cat==="all"?words:words.filter(w=>w.cat===cat);

  return(
    <div style={{minHeight:"100vh",background:"#0F1117",color:"#fff",fontFamily:"'Nunito',sans-serif"}}>
      <header style={{background:"rgba(255,255,255,0.05)",borderBottom:"1px solid rgba(255,255,255,0.08)",padding:"13px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,letterSpacing:1}}>👁️ SaySee <span style={{fontSize:12,color:"#A29BFE",fontFamily:"'Nunito',sans-serif",fontWeight:700}}>ADMIN</span></div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {["words","subscribers","analytics"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:"6px 14px",borderRadius:10,border:"none",background:tab===t?"#6C5CE7":"rgba(255,255,255,0.08)",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer",textTransform:"capitalize"}}>{t}</button>
          ))}
          <button onClick={onLogout} style={{padding:"6px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.15)",background:"transparent",color:"#888",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>Logout</button>
        </div>
      </header>

      <div style={{maxWidth:900,margin:"0 auto",padding:"24px 18px"}}>
        {tab==="words"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24}}>Master Word Library</div>
            <button onClick={()=>setAddW(true)} style={{padding:"9px 18px",borderRadius:10,border:"none",background:"#00B894",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,cursor:"pointer"}}>+ Add Word</button>
          </div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:18}}>
            {["all",...CATS.map(c=>c.id)].map(id=>(
              <button key={id} onClick={()=>setCat(id)} style={{padding:"5px 12px",borderRadius:30,border:"none",cursor:"pointer",background:cat===id?(CATS.find(c=>c.id===id)?.color||"#6C5CE7"):"rgba(255,255,255,0.08)",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:12,textTransform:"capitalize"}}>{id}</button>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
            {shown.map(w=>(
              <div key={w.id} onClick={()=>setEditW({...w})} style={{background:"rgba(255,255,255,0.05)",borderRadius:12,padding:"12px 14px",cursor:"pointer",border:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",gap:10,transition:"background 0.15s"}}>
                <span style={{fontSize:28}}>{w.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:13}}>{w.display}</div>
                  <div style={{fontSize:11,color:"#666",marginTop:2}}>{w.cat} · {(w.triggers||[]).length} triggers</div>
                </div>
                <div style={{width:9,height:9,borderRadius:"50%",background:w.color,flexShrink:0}}/>
              </div>
            ))}
          </div>
        </>}

        {tab==="subscribers"&&(
          <div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,marginBottom:18}}>Subscribers</div>
            <div style={{background:"rgba(255,255,255,0.05)",borderRadius:16,padding:24,textAlign:"center"}}>
              <div style={{fontSize:38,marginBottom:10}}>📊</div>
              <div style={{fontSize:14,color:"#555",marginBottom:24}}>Subscriber management connects to your backend in production.</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
                {[["Total Users","1"],["Active Plans","1"],["MRR","$28"]].map(([l,v])=>(
                  <div key={l} style={{background:"rgba(255,255,255,0.06)",borderRadius:12,padding:16}}>
                    <div style={{fontSize:26,fontFamily:"'Fredoka One',cursive",color:"#6C5CE7"}}>{v}</div>
                    <div style={{fontSize:12,color:"#555",marginTop:4}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab==="analytics"&&(
          <div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,marginBottom:18}}>Analytics</div>
            <div style={{background:"rgba(255,255,255,0.05)",borderRadius:16,padding:32,textAlign:"center"}}>
              <div style={{fontSize:38,marginBottom:10}}>📈</div>
              <div style={{fontSize:14,color:"#555"}}>Analytics connect to your backend in production.</div>
            </div>
          </div>
        )}
      </div>

      {editW&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,backdropFilter:"blur(6px)"}} onClick={()=>setEditW(null)}>
          <div style={{background:"#1A1A2E",borderRadius:20,padding:28,width:"min(94vw,500px)",maxHeight:"90vh",overflowY:"auto",border:"1px solid rgba(255,255,255,0.1)",animation:"popIn 0.3s cubic-bezier(.34,1.56,.64,1)"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#fff",marginBottom:20}}>Edit Word</div>
            <AdminWordForm word={editW} onSave={w=>{setWords(p=>p.map(x=>x.id===w.id?w:x));setEditW(null);}} onDelete={id=>{setWords(p=>p.filter(x=>x.id!==id));setEditW(null);}} onClose={()=>setEditW(null)}/>
          </div>
        </div>
      )}
      {addW&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,backdropFilter:"blur(6px)"}} onClick={()=>setAddW(false)}>
          <div style={{background:"#1A1A2E",borderRadius:20,padding:28,width:"min(94vw,500px)",maxHeight:"90vh",overflowY:"auto",border:"1px solid rgba(255,255,255,0.1)",animation:"popIn 0.3s cubic-bezier(.34,1.56,.64,1)"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#fff",marginBottom:20}}>New Word</div>
            <AdminWordForm onSave={w=>{setWords(p=>[...p,{...w,id:Date.now()}]);setAddW(false);}} onClose={()=>setAddW(false)}/>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminWordForm({word,onSave,onDelete,onClose}){
  const [f,setF]=useState(word||{cat:"core",word:"",display:"",emoji:"",photo:"",color:"#0984E3",triggers:[""]});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const dark={width:"100%",padding:"9px 12px",border:"2px solid rgba(255,255,255,0.12)",borderRadius:10,fontSize:14,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box",background:"rgba(255,255,255,0.06)",color:"#fff"};
  const lbl={fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block",fontFamily:"'Nunito',sans-serif"};
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        {[["Word","word"],["Display","display"],["Emoji","emoji"],["Photo hint","photo"]].map(([l,k])=>(
          <div key={k}><label style={lbl}>{l}</label><input value={f[k]||""} onChange={e=>s(k,e.target.value)} style={dark}/></div>
        ))}
        <div>
          <label style={lbl}>Category</label>
          <select value={f.cat} onChange={e=>s("cat",e.target.value)} style={{...dark,color:f.cat?"#fff":"rgba(255,255,255,0.4)"}}>
            {CATS.map(c=><option key={c.id} value={c.id} style={{background:"#1A1A2E"}}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Color</label>
          <input type="color" value={f.color||"#0984E3"} onChange={e=>s("color",e.target.value)} style={{width:44,height:34,border:"none",cursor:"pointer",borderRadius:6,background:"transparent"}}/>
        </div>
      </div>
      <div style={{marginBottom:16}}>
        <label style={lbl}>Voice triggers (one per line)</label>
        <textarea value={(f.triggers||[]).join("\n")} onChange={e=>s("triggers",e.target.value.split("\n"))} rows={4} style={{...dark,resize:"vertical"}}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        {word&&<button onClick={()=>onDelete(word.id)} style={{padding:"10px 14px",borderRadius:10,border:"2px solid #E74C3C",background:"transparent",color:"#E74C3C",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,cursor:"pointer"}}>Delete</button>}
        <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:10,border:"2px solid rgba(255,255,255,0.15)",background:"transparent",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer"}}>Cancel</button>
        <button onClick={()=>onSave(f)} style={{flex:2,padding:"10px",borderRadius:10,border:"none",background:"#6C5CE7",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:15,cursor:"pointer"}}>Save Word</button>
      </div>
    </div>
  );
}

// ── Teacher app ───────────────────────────────────────────────
function TeacherApp({user,words,onLogout}){
  const [students,setStudents]   = useState(mem.get(`stu_${user.id}`, user.id==="demo"?DEMO_STUDENTS:[]));
  const [customW,setCustomW]     = useState(mem.get(`cw_${user.id}`,[]));
  const [photos,setPhotos]       = useState(()=>{ const p={}; /* load any saved photos */ return p; });
  const [photoModal,setPhotoModal] = useState(null); // word entry awaiting photo
  const allWords                 = [...words.filter(w=>w.cat!=="custom"),...customW];

  const [activeId,setActiveId]   = useState(students[0]?.id||null);
  const [activeCat,setActiveCat] = useState("core");
  const [curWord,setCurWord]     = useState(null);
  const [level,setLevel]         = useState(1);
  const [listening,setListening] = useState(false);
  const [transcript,setTrans]    = useState("");
  const [flash,setFlash]         = useState(false);
  const [stuMode,setStuMode]     = useState(false);
  const [drawer,setDrawer]       = useState(false);
  const [dtab,setDtab]           = useState("students");
  const [addStu,setAddStu]       = useState(false);
  const [editStu,setEditStu]     = useState(null);
  const [addWord,setAddWord]     = useState(false);
  const [shareInfo,setShareInfo] = useState(null);

  const recRef  = useRef(null);
  const lisRef  = useRef(false);
  const wRef    = useRef(allWords);
  useEffect(()=>{wRef.current=allWords;},[allWords]);

  useEffect(()=>{mem.set(`stu_${user.id}`,students);},[students]);
  useEffect(()=>{mem.set(`cw_${user.id}`,customW);},[customW]);

  const activeStu = students.find(s=>s.id===activeId)||null;
  useEffect(()=>{if(activeStu)setLevel(activeStu.level);},[activeId]);

  const [micError,setMicError]=useState("");

  const startMic=useCallback(()=>{
    setMicError("");
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){
      setMicError("Needs Chrome or Edge browser for voice recognition.");
      return;
    }
    if(recRef.current){ lisRef.current=false; try{recRef.current.stop();}catch{} recRef.current=null; }
    try{
      const rec=new SR();
      rec.continuous=true; rec.interimResults=true; rec.lang="en-US";
      rec.onstart=()=>{ setListening(true); setMicError(""); };
      rec.onresult=(e)=>{
        for(let i=e.resultIndex;i<e.results.length;i++){
          const t=e.results[i][0].transcript.toLowerCase().trim();
          if(e.results[i].isFinal){
            setTrans(t);
            const m=wRef.current.find(w=>(w.triggers||[w.word]).some(tr=>t.includes(tr)));
            if(m){setCurWord(m);setFlash(true);setTimeout(()=>setFlash(false),700);}
          } else setTrans(t);
        }
      };
      rec.onerror=(e)=>{
        if(e.error==="not-allowed"||e.error==="service-not-allowed"){
          lisRef.current=false; setListening(false); recRef.current=null;
          setMicError("Mic blocked. Allow microphone in browser settings, then tap again.");
        } else if(e.error==="no-speech"){
          // non-fatal
        } else {
          lisRef.current=false; setListening(false); recRef.current=null;
          setMicError("Mic error: "+e.error+". Tap to retry.");
        }
      };
      rec.onend=()=>{
        if(lisRef.current){ try{ rec.start(); }catch{ lisRef.current=false; setListening(false); } }
        else { setListening(false); }
      };
      recRef.current=rec;
      lisRef.current=true;
      rec.start();
    } catch(err){
      setMicError("Could not start mic. Try opening this app directly in Chrome.");
      lisRef.current=false; setListening(false);
    }
  },[]);

  const stopMic=useCallback(()=>{
    lisRef.current=false; setListening(false); setMicError("");
    try{recRef.current?.stop();}catch{} recRef.current=null;
  },[]);

  useEffect(()=>{ return()=>{ lisRef.current=false; try{recRef.current?.stop();}catch{}; }; },[]);

  const markLearned=(wid)=>{
    if(!activeId)return;
    setStudents(p=>p.map(s=>s.id===activeId?{...s,progress:{...s.progress,[wid]:true}}:s));
  };

  const handlePhotoSaved=(wordId, dataUrl)=>{
    setPhotos(p=>({...p,[wordId]:dataUrl}));
  };

  const shareCode=(stu)=>{
    const code=btoa(stu.name+Date.now()).replace(/[^A-Z0-9]/gi,"").slice(0,8).toUpperCase();
    setShareInfo({stu,code});
  };

  const ac=curWord?.color||(CATS.find(c=>c.id===activeCat)?.color||"#0984E3");
  const filtered=allWords.filter(w=>w.cat===activeCat);

  if(stuMode) return <StudentMode entry={curWord} level={level} listening={listening} transcript={transcript} onExit={()=>setStuMode(false)}/>;

  return(
    <div style={{minHeight:"100vh",background:flash?"#FFFDE7":"#F4F6FB",transition:"background 0.3s",display:"flex",flexDirection:"column",fontFamily:"'Nunito',sans-serif"}}>

      {/* TOP BAR */}
      <header style={{background:"#fff",boxShadow:"0 2px 14px rgba(0,0,0,0.07)",padding:"9px 14px",display:"flex",alignItems:"center",gap:9}}>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:19,color:"#1A1A2E",letterSpacing:0.5,flexShrink:0}}>👁️ SaySee</div>

        {/* Student carousel */}
        <div style={{flex:1,display:"flex",gap:7,overflowX:"auto",scrollbarWidth:"none",padding:"2px 0"}}>
          {students.map(s=>(
            <button key={s.id} onClick={()=>setActiveId(s.id)} style={{flexShrink:0,display:"flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:30,background:activeId===s.id?s.color:"#F0F2F5",border:`2px solid ${activeId===s.id?s.color:"transparent"}`,color:activeId===s.id?"#fff":"#666",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,cursor:"pointer",transition:"all 0.2s",boxShadow:activeId===s.id?`0 2px 10px ${s.color}55`:"none"}}>
              <span style={{fontSize:17}}>{s.avatar}</span>
              {s.name.split(" ")[0]}
            </button>
          ))}
          <button onClick={()=>setAddStu(true)} style={{flexShrink:0,padding:"5px 11px",borderRadius:30,background:"#F0F2F5",border:"2px dashed #C8D0DA",color:"#AAB",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,cursor:"pointer"}}>+</button>
        </div>

        {/* Right controls */}
        <div style={{display:"flex",gap:7,flexShrink:0,alignItems:"center"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <button onClick={listening?stopMic:startMic} style={{width:44,height:44,borderRadius:"50%",border:`3px solid ${listening?"#2ECC71":"#CBD5E0"}`,fontSize:20,cursor:"pointer",background:listening?"linear-gradient(135deg,#2ECC71,#27AE60)":"#fff",boxShadow:listening?"0 0 0 5px #2ECC7133":"0 2px 8px rgba(0,0,0,0.1)",animation:listening?"micGlow 2s ease-in-out infinite":"none",transition:"all 0.3s",display:"flex",alignItems:"center",justifyContent:"center"}}>🎤</button>
            <span style={{fontFamily:"'Nunito',sans-serif",fontSize:9,fontWeight:800,color:listening?"#2ECC71":"#CBD5E0",letterSpacing:0.5,textTransform:"uppercase"}}>{listening?"ON":"OFF"}</span>
          </div>
          <button onClick={()=>setStuMode(true)} style={{padding:"6px 12px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#0984E3,#6C5CE7)",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,cursor:"pointer",boxShadow:"0 3px 12px rgba(9,132,227,0.4)"}}>▶ Student</button>
          <button onClick={()=>setDrawer(true)} style={{width:38,height:38,borderRadius:9,border:"none",fontSize:17,cursor:"pointer",background:"#F0F2F5",display:"flex",alignItems:"center",justifyContent:"center"}}>⚙️</button>
        </div>
      </header>

      {/* LEVEL BAR */}
      <div style={{background:"#fff",borderBottom:"1px solid #EEF0F4",display:"flex",justifyContent:"center",gap:6,padding:"7px 12px"}}>
        {LEVELS.map(l=>(
          <button key={l.id} onClick={()=>setLevel(l.id)} style={{padding:"5px 13px",borderRadius:30,border:"none",background:level===l.id?ac:"#F0F2F5",color:level===l.id?"#fff":"#777",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,cursor:"pointer",transition:"all 0.2s",boxShadow:level===l.id?`0 3px 12px ${ac}55`:"none"}}>{l.icon} {l.label}</button>
        ))}
      </div>

      {/* CATEGORY BAR */}
      <div style={{background:"#fff",borderBottom:"1px solid #EEF0F4",display:"flex",overflowX:"auto",gap:5,padding:"6px 12px",scrollbarWidth:"none"}}>
        {CATS.map(c=>(
          <button key={c.id} onClick={()=>setActiveCat(c.id)} style={{padding:"4px 11px",borderRadius:30,border:"none",whiteSpace:"nowrap",flexShrink:0,background:activeCat===c.id?c.color:"#F4F5F7",color:activeCat===c.id?"#fff":"#777",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:11,cursor:"pointer",transition:"all 0.2s",boxShadow:activeCat===c.id?`0 2px 10px ${c.color}55`:"none"}}>{c.icon} {c.label}</button>
        ))}
      </div>

      {/* MAIN */}
      <main style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"18px 16px",gap:16}}>
        {curWord?(
          <>
            <WordCard entry={curWord} level={level} photoOverride={photos[curWord.id]} onRequestPhoto={level===1?()=>setPhotoModal(curWord):null}/>
            {level<4&&<div style={{fontFamily:"'Fredoka One',cursive",fontSize:"clamp(24px,7vw,50px)",color:ac,letterSpacing:2,textShadow:`0 2px 12px ${ac}44`,animation:"popIn 0.4s cubic-bezier(.34,1.56,.64,1)"}}>{curWord.display}</div>}
            {activeStu&&(
              <button onClick={()=>markLearned(curWord.id)} style={{padding:"8px 20px",borderRadius:30,border:"none",background:activeStu.progress?.[curWord.id]?"#2ECC71":"#F0F2F5",color:activeStu.progress?.[curWord.id]?"#fff":"#999",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,cursor:"pointer",transition:"all 0.2s"}}>
                {activeStu.progress?.[curWord.id]?"✅ Learned!":"Mark as Learned"}
              </button>
            )}
          </>
        ):(
          <div style={{textAlign:"center",opacity:0.35}}>
            <div style={{fontSize:68,marginBottom:10}}>👂</div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#888"}}>{listening?"Say a word…":"Tap the mic to start"}</div>
          </div>
        )}

        {/* Word chips */}
        {filtered.length>0&&(
          <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:6,maxWidth:520}}>
            {filtered.map(w=>(
              <button key={w.id} onClick={()=>setCurWord(w)} style={{padding:"5px 12px",borderRadius:30,background:curWord?.id===w.id?w.color:"#fff",border:`2px solid ${curWord?.id===w.id?w.color:"#E4E8EE"}`,color:curWord?.id===w.id?"#fff":"#555",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,cursor:"pointer",transition:"all 0.15s",boxShadow:curWord?.id===w.id?`0 2px 10px ${w.color}55`:"none"}}>
                {w.emoji} {w.display}
                {level===1&&!photos[w.id]&&!getWordPhoto(w.id)&&<span style={{fontSize:9,opacity:0.6}}> 📸</span>}
                {activeStu?.progress?.[w.id]&&<span> ✅</span>}
              </button>
            ))}
          </div>
        )}

        {micError&&(
          <div style={{background:"#FFF3CD",border:"1px solid #FFEAA7",borderRadius:10,padding:"10px 14px",maxWidth:400,textAlign:"center",fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#856404",fontWeight:700}}>
            ⚠️ {micError}
          </div>
        )}
        {!micError&&transcript&&<div style={{fontSize:11,color:"#C0C7D0",fontStyle:"italic"}}>heard: "{transcript}"</div>}
      </main>

      {/* SETTINGS DRAWER */}
      {drawer&&(
        <div style={{position:"fixed",inset:0,background:"rgba(10,12,30,0.55)",zIndex:500,backdropFilter:"blur(4px)"}} onClick={()=>setDrawer(false)}>
          <div style={{position:"absolute",right:0,top:0,bottom:0,width:"min(94vw,370px)",background:"#fff",overflowY:"auto",animation:"slideR 0.3s ease"}} onClick={e=>e.stopPropagation()}>
            {/* Drawer tabs */}
            <div style={{background:"#F8F9FC",borderBottom:"1px solid #EEF0F4",display:"flex",padding:"12px 16px 0",gap:4,overflowX:"auto",scrollbarWidth:"none"}}>
              {[["students","👤"],["words","📚"],["account","👤"]].map(([t,ic])=>(
                <button key={t} onClick={()=>setDtab(t)} style={{padding:"7px 12px",border:"none",background:"transparent",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,color:dtab===t?"#0984E3":"#AAA",borderBottom:`3px solid ${dtab===t?"#0984E3":"transparent"}`,cursor:"pointer",textTransform:"capitalize",whiteSpace:"nowrap"}}>{ic} {t}</button>
              ))}
              <button onClick={()=>setDrawer(false)} style={{marginLeft:"auto",background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#BBB",padding:"0 8px",flexShrink:0}}>✕</button>
            </div>

            <div style={{padding:22}}>
              {/* STUDENTS */}
              {dtab==="students"&&<>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{fontFamily:"'Fredoka One',cursive",fontSize:19,color:"#1A1A2E"}}>Students</div>
                  <div style={{fontSize:12,color:"#AAA"}}>{students.length}/{user.maxStudents||28}</div>
                </div>
                <button onClick={()=>setAddStu(true)} style={{width:"100%",padding:"11px",background:"#0984E3",color:"#fff",border:"none",borderRadius:12,fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:14,cursor:"pointer",marginBottom:14,boxShadow:"0 4px 14px #0984E355"}}>+ Add Student</button>
                {students.map(s=>{
                  const learned=Object.keys(s.progress||{}).length;
                  return(
                    <div key={s.id} style={{background:"#F8F9FC",borderRadius:13,padding:"11px 13px",marginBottom:9,border:`2px solid ${activeId===s.id?s.color:"transparent"}`}}>
                      <div style={{display:"flex",alignItems:"center",gap:9}}>
                        <div style={{width:38,height:38,borderRadius:"50%",background:s.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{s.avatar}</div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:900,fontSize:14,color:"#1A1A2E"}}>{s.name}</div>
                          <div style={{fontSize:11,color:"#AAA"}}>Level {s.level} · {learned} learned</div>
                        </div>
                        <button onClick={()=>shareCode(s)} title="Share" style={{background:"#EEF3FF",border:"none",borderRadius:7,padding:"4px 8px",cursor:"pointer",fontSize:13}}>🔗</button>
                        <button onClick={()=>setEditStu(s)} style={{background:"#F4F5F7",border:"none",borderRadius:7,padding:"4px 8px",cursor:"pointer",fontSize:13}}>✏️</button>
                      </div>
                      {/* mini progress */}
                      <div style={{marginTop:8,display:"flex",gap:4}}>
                        {CATS.filter(c=>c.id!=="custom").map(c=>{
                          const cw=allWords.filter(w=>w.cat===c.id);
                          const cl=cw.filter(w=>s.progress?.[w.id]).length;
                          const pct=cw.length?cl/cw.length*100:0;
                          return(
                            <div key={c.id} title={`${c.label}: ${cl}/${cw.length}`} style={{flex:1,height:4,background:"#E8ECF0",borderRadius:2,overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${pct}%`,background:c.color,borderRadius:2}}/>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>}

              {/* WORDS */}
              {dtab==="words"&&<>
                <div style={{fontFamily:"'Fredoka One',cursive",fontSize:19,color:"#1A1A2E",marginBottom:14}}>My Custom Words</div>
                <button onClick={()=>setAddWord(true)} style={{width:"100%",padding:"11px",background:"#00B894",color:"#fff",border:"none",borderRadius:12,fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:14,cursor:"pointer",marginBottom:14,boxShadow:"0 4px 14px #00B89455"}}>+ Add Custom Word</button>
                {customW.length===0&&<div style={{textAlign:"center",padding:"28px 0",color:"#CCC"}}><div style={{fontSize:36,marginBottom:8}}>✏️</div><div style={{fontSize:13}}>No custom words yet</div></div>}
                {customW.map(w=>(
                  <div key={w.id} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",background:"#F8F9FC",borderRadius:11,marginBottom:7}}>
                    <span style={{fontSize:24}}>{w.emoji}</span>
                    <div style={{flex:1}}><div style={{fontWeight:800,fontSize:13,color:"#1A1A2E"}}>{w.display}</div><div style={{fontSize:11,color:"#BBB"}}>{w.cat}</div></div>
                    <button onClick={()=>setCustomW(p=>p.filter(x=>x.id!==w.id))} style={{background:"none",border:"none",fontSize:15,cursor:"pointer",color:"#E74C3C"}}>🗑</button>
                  </div>
                ))}
              </>}

              {/* ACCOUNT */}
              {dtab==="account"&&<>
                <div style={{fontFamily:"'Fredoka One',cursive",fontSize:19,color:"#1A1A2E",marginBottom:14}}>Account</div>
                <div style={{background:"#F8F9FC",borderRadius:13,padding:14,marginBottom:12}}>
                  <div style={{fontWeight:900,fontSize:15,color:"#1A1A2E"}}>{user.name}</div>
                  <div style={{fontSize:13,color:"#AAA",marginTop:2}}>{user.email}</div>
                  <div style={{display:"inline-block",marginTop:7,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:800,background:"#0984E322",color:"#0984E3"}}>{(user.plan||"free").toUpperCase()}</div>
                </div>
                <div style={{background:"#FFF7ED",borderRadius:13,padding:14,marginBottom:12,border:"1px solid #FED7AA"}}>
                  <div style={{fontWeight:800,fontSize:13,color:"#C05621"}}>Students</div>
                  <div style={{fontSize:13,color:"#9C4221",marginTop:4}}>{students.length} of {user.maxStudents||28} used</div>
                  <div style={{height:5,background:"#FEEBC8",borderRadius:3,overflow:"hidden",marginTop:7}}>
                    <div style={{height:"100%",width:`${Math.min(100,students.length/(user.maxStudents||28)*100)}%`,background:"#ED8936",borderRadius:3}}/>
                  </div>
                </div>
                <div style={{background:"#F0FFF4",borderRadius:13,padding:14,marginBottom:18,border:"1px solid #C6F6D5"}}>
                  <div style={{fontWeight:800,fontSize:13,color:"#276749"}}>Subscription</div>
                  <div style={{fontSize:13,color:"#4A856A",marginTop:4,lineHeight:1.5}}>Billing connects to Stripe in production. Upgrade, cancel, and invoice management will be available here.</div>
                </div>
                <button onClick={onLogout} style={{width:"100%",padding:"11px",borderRadius:12,border:"2px solid #E74C3C",background:"#fff",color:"#E74C3C",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,cursor:"pointer"}}>Log Out</button>
              </>}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {addStu&&<StuModal onSave={s=>{if(students.length>=(user.maxStudents||28))return;setStudents(p=>[...p,s]);setActiveId(s.id);setAddStu(false);}} onClose={()=>setAddStu(false)} maxReached={students.length>=(user.maxStudents||28)}/>}
      {editStu&&<StuModal existing={editStu} onSave={s=>{setStudents(p=>p.map(x=>x.id===s.id?s:x));setEditStu(null);}} onDelete={id=>{setStudents(p=>p.filter(x=>x.id!==id));if(activeId===id)setActiveId(students.find(s=>s.id!==id)?.id||null);setEditStu(null);}} onClose={()=>setEditStu(null)}/>}
      {addWord&&<CWModal onAdd={w=>setCustomW(p=>[...p,w])} onClose={()=>setAddWord(false)}/>}

      {/* Photo upload modal */}
      {photoModal&&(
        <PhotoModal entry={photoModal} onSaved={(id,url)=>{handlePhotoSaved(id,url);setPhotoModal(null);}} onClose={()=>setPhotoModal(null)}/>
      )}

      {shareInfo&&(
        <Modal onClose={()=>setShareInfo(null)}>
          <MH>🔗 Share {shareInfo.stu.name}</MH>
          <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:"#555",marginBottom:18,lineHeight:1.6}}>Share this student's profile with a parent, therapist, or another teacher. They can import it into their SaySee account.</div>
          <div style={{background:"#F8F9FC",borderRadius:12,padding:16,textAlign:"center",marginBottom:14}}>
            <div style={{fontSize:11,color:"#AAA",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Share Code</div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:30,color:"#0984E3",letterSpacing:5}}>{shareInfo.code}</div>
          </div>
          <div style={{background:"#FFFBEB",borderRadius:11,padding:11,fontSize:12,color:"#92600A",marginBottom:18}}>ℹ️ Parents/aides get read-only access. Teacher handoffs include full progress data.</div>
          <Btn full onClick={()=>setShareInfo(null)}>Done</Btn>
        </Modal>
      )}
    </div>
  );
}

// ── Photo upload modal ───────────────────────────────────────
function PhotoModal({entry, onSaved, onClose}){
  const inputRef=useRef(null);
  const [preview,setPreview]=useState(getWordPhoto(entry.id)||null);
  const [saving,setSaving]=useState(false);

  const handleFile=async(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    setSaving(true);
    try{
      const dataUrl=await readFileAsDataURL(file);
      setPreview(dataUrl);
      setSaving(false);
    }catch(err){ setSaving(false); }
    e.target.value="";
  };

  const handleSave=()=>{
    if(!preview)return;
    setWordPhoto(entry.id, preview);
    onSaved(entry.id, preview);
  };

  const handleRemove=()=>{
    setWordPhoto(entry.id, null);
    setPreview(null);
  };

  return(
    <Modal onClose={onClose}>
      <MH>📸 Photo for "{entry.display}"</MH>
      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#666",marginBottom:18,lineHeight:1.6}}>
        Take or upload a real photo from your classroom. This makes the word more meaningful for your students — their actual chair, their real cafeteria, their own playground.
      </div>

      {/* Preview area */}
      <div style={{width:"100%",aspectRatio:"1",borderRadius:20,overflow:"hidden",marginBottom:16,
        background:preview?`#000`:`${entry.color}10`,
        border:preview?"none":`3px dashed ${entry.color}55`,
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        position:"relative"}}>
        {preview?(
          <>
            <img src={preview} alt="preview" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            <button onClick={handleRemove} style={{position:"absolute",top:10,right:10,
              background:"rgba(0,0,0,0.6)",color:"#fff",border:"none",borderRadius:"50%",
              width:32,height:32,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </>
        ):(
          <>
            <div style={{fontSize:64,marginBottom:10}}>{entry.emoji}</div>
            <div style={{fontFamily:"'Nunito',sans-serif",fontSize:13,color:"#AAA",textAlign:"center",padding:"0 20px"}}>
              No photo yet — tap below to add one
            </div>
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input ref={inputRef} type="file" accept="image/*" capture="environment"
        onChange={handleFile} style={{display:"none"}}/>

      {/* Buttons */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>{ if(inputRef.current){ inputRef.current.removeAttribute("capture"); inputRef.current.click(); }}} style={{
            flex:1,padding:"12px",borderRadius:12,border:`2px solid ${entry.color}`,
            background:"#fff",color:entry.color,fontFamily:"'Nunito',sans-serif",
            fontWeight:800,fontSize:14,cursor:"pointer"}}>
            🖼️ Upload Photo
          </button>
          <button onClick={()=>{ if(inputRef.current){ inputRef.current.setAttribute("capture","environment"); inputRef.current.click(); }}} style={{
            flex:1,padding:"12px",borderRadius:12,border:"none",
            background:entry.color,color:"#fff",fontFamily:"'Nunito',sans-serif",
            fontWeight:800,fontSize:14,cursor:"pointer",
            boxShadow:`0 4px 14px ${entry.color}55`}}>
            📷 Take Photo
          </button>
        </div>
        <div style={{display:"flex",gap:10}}>
          <Btn outline onClick={onClose} style={{flex:1}}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={!preview} style={{flex:2,background:entry.color}}>Save Photo</Btn>
        </div>
      </div>

      {saving&&<div style={{textAlign:"center",marginTop:10,fontSize:13,color:"#AAA",fontFamily:"'Nunito',sans-serif"}}>Processing…</div>}

      <div style={{marginTop:16,padding:"10px 14px",background:"#F0FFF4",borderRadius:10,border:"1px solid #C6F6D5"}}>
        <div style={{fontFamily:"'Nunito',sans-serif",fontSize:12,color:"#276749",lineHeight:1.6}}>
          ✅ <strong>Your photos stay private.</strong> They're stored on your device and never shared without your permission. No stock photos, no copyright issues.
        </div>
      </div>
    </Modal>
  );
}

// ── Student modal ─────────────────────────────────────────────
function StuModal({existing,onSave,onDelete,onClose,maxReached}){
  const [name,setName]=useState(existing?.name||"");
  const [ava,setAva]=useState(existing?.avatar||AVATARS[0]);
  const [color,setColor]=useState(existing?.color||"#0984E3");
  const [lvl,setLvl]=useState(existing?.level||1);
  if(maxReached&&!existing) return(
    <Modal onClose={onClose}><MH>Student Limit Reached</MH>
      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:"#555",marginBottom:18}}>You've reached 28 students. Contact us for a school site license.</div>
      <Btn full onClick={onClose}>Close</Btn>
    </Modal>
  );
  return(
    <Modal onClose={onClose}>
      <MH>{existing?"Edit Student":"New Student"}</MH>
      <Field label="Name *" value={name} onChange={setName} placeholder="Student's first name"/>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#666",textTransform:"uppercase",letterSpacing:0.5,marginBottom:7}}>Avatar</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{AVATARS.map(a=><button key={a} onClick={()=>setAva(a)} style={{fontSize:22,background:ava===a?color+"22":"#F4F5F7",border:`2px solid ${ava===a?color:"transparent"}`,borderRadius:9,padding:"3px 7px",cursor:"pointer"}}>{a}</button>)}</div>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#666",textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Color</div>
        <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{width:42,height:30,border:"none",cursor:"pointer",borderRadius:6}}/>
      </div>
      <div style={{marginBottom:18}}>
        <div style={{fontSize:12,fontWeight:700,color:"#666",textTransform:"uppercase",letterSpacing:0.5,marginBottom:7}}>Starting Level</div>
        <div style={{display:"flex",gap:6}}>{LEVELS.map(l=><button key={l.id} onClick={()=>setLvl(l.id)} style={{flex:1,padding:"7px 3px",borderRadius:9,border:"none",background:lvl===l.id?color:"#F0F2F5",color:lvl===l.id?"#fff":"#777",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:11,cursor:"pointer"}}>{l.icon} {l.label}</button>)}</div>
      </div>
      <div style={{display:"flex",gap:8}}>
        {existing&&<Btn danger onClick={()=>{onDelete(existing.id);onClose();}}>Delete</Btn>}
        <Btn outline onClick={onClose} style={{flex:1}}>Cancel</Btn>
        <Btn onClick={()=>{if(!name.trim())return;onSave({id:existing?.id||`s_${Date.now()}`,name:name.trim(),avatar:ava,color,level:lvl,progress:existing?.progress||{},sharedWith:[]});onClose();}} style={{flex:2}}>Save</Btn>
      </div>
    </Modal>
  );
}

// ── Custom word modal ─────────────────────────────────────────
function CWModal({onAdd,onClose}){
  const [word,setWord]=useState("");
  const [disp,setDisp]=useState("");
  const [emoji,setEmoji]=useState("");
  const [photo,setPhoto]=useState("");
  const [color,setColor]=useState("#0984E3");
  const [trigs,setTrigs]=useState("");
  const [cat,setCat]=useState("custom");
  return(
    <Modal onClose={onClose}>
      <MH>Add Custom Word</MH>
      <Field label="Word *"         value={word}  onChange={setWord}  placeholder="apple"/>
      <Field label="Display Text"   value={disp}  onChange={setDisp}  placeholder="APPLE"/>
      <Field label="Emoji *"        value={emoji} onChange={setEmoji} placeholder="🍎"/>
      <Field label="Photo Search"   value={photo} onChange={setPhoto} placeholder="red apple fruit"/>
      <Field label="Voice Triggers (comma-separated)" value={trigs} onChange={setTrigs} placeholder="apple, eat apple"/>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#666",textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Category</div>
        <select value={cat} onChange={e=>setCat(e.target.value)} style={{width:"100%",padding:"10px 12px",border:"2px solid #E8ECF0",borderRadius:10,fontSize:14,fontFamily:"'Nunito',sans-serif",outline:"none"}}>
          {CATS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      <div style={{marginBottom:18}}>
        <div style={{fontSize:12,fontWeight:700,color:"#666",textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Color</div>
        <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{width:42,height:30,border:"none",cursor:"pointer",borderRadius:6}}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        <Btn outline onClick={onClose} style={{flex:1}}>Cancel</Btn>
        <Btn onClick={()=>{if(!word.trim()||!emoji.trim())return;onAdd({id:`cw_${Date.now()}`,cat,word:word.trim().toLowerCase(),display:(disp.trim()||word.trim()).toUpperCase(),emoji:emoji.trim(),photo:photo.trim()||word.trim(),color,triggers:[word.trim().toLowerCase(),...trigs.split(",").map(t=>t.trim().toLowerCase()).filter(Boolean)]});onClose();}} style={{flex:2}}>Add Word</Btn>
      </div>
    </Modal>
  );
}

// ── District Admin Panel ─────────────────────────────────────
function DistrictAdminPanel({user, onLogout}){
  const [tab,setTab]           = useState("overview");
  const [teachers,setTeachers] = useState([]);
  const [students,setStudents] = useState([]);
  const [licenses,setLicenses] = useState([]);
  const [loading,setLoading]   = useState(true);

  useEffect(()=>{
    const load = async () => {
      setLoading(true);
      try {
        const [t,s,l] = await Promise.all([
          sbData.getDistrictTeachers(user.district_id),
          sbData.getDistrictStudents(user.district_id),
          sbData.getLicenses(user.district_id)
        ]);
        setTeachers(t); setStudents(s); setLicenses(l);
      } catch(e){ console.log("Load error",e); }
      setLoading(false);
    };
    load();
  },[]);

  const exportCSV = () => {
    const rows = [["Teacher","Email","Students","Last Login"],...teachers.map(t=>[t.name,t.email,students.filter(s=>s.teacher_id===t.id).length,t.last_login||"Never"])];
    const csv = rows.map(r=>r.join(",")).join("
");
    const blob = new Blob([csv],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="SaySee_District_Report.csv"; a.click();
  };

  const usedLicenses = licenses.filter(l=>l.status==="active").length;
  const totalLicenses = licenses.length;

  return(
    <div style={{minHeight:"100vh",background:"#F4F6FB",fontFamily:"'Nunito',sans-serif"}}>
      {/* Header */}
      <header style={{background:"#fff",boxShadow:"0 2px 14px rgba(0,0,0,0.07)",padding:"12px 22px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#1A1A2E"}}>👁️ SaySee <span style={{fontSize:12,color:"#27AE60",fontFamily:"'Nunito',sans-serif",fontWeight:700}}>DISTRICT</span></div>
          <div style={{fontSize:12,color:"#AAA"}}>{user.name} · {user.email}</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportCSV} style={{padding:"8px 16px",borderRadius:10,border:"none",background:"#27AE60",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,cursor:"pointer"}}>⬇️ Export CSV</button>
          <button onClick={onLogout} style={{padding:"8px 14px",borderRadius:10,border:"2px solid #E74C3C",background:"#fff",color:"#E74C3C",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,cursor:"pointer"}}>Logout</button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{background:"#fff",borderBottom:"1px solid #EEF0F4",display:"flex",padding:"0 20px",gap:4}}>
        {[["overview","📊 Overview"],["teachers","👤 Teachers"],["students","🎓 Students"],["licenses","🔑 Licenses"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"12px 16px",border:"none",background:"transparent",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:13,color:tab===t?"#0984E3":"#AAA",borderBottom:`3px solid ${tab===t?"#0984E3":"transparent"}`,cursor:"pointer"}}>{l}</button>
        ))}
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"24px 18px"}}>
        {loading&&<div style={{textAlign:"center",padding:40,color:"#AAA",fontFamily:"'Fredoka One',cursive",fontSize:20}}>Loading district data…</div>}

        {!loading&&tab==="overview"&&(
          <div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,color:"#1A1A2E",marginBottom:20}}>District Overview</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:16,marginBottom:24}}>
              {[
                ["Total Teachers",teachers.length,"#0984E3","👤"],
                ["Total Students",students.length,"#8E44AD","🎓"],
                ["Licenses Used",`${usedLicenses}/${totalLicenses}`,"#27AE60","🔑"],
                ["Available Licenses",totalLicenses-usedLicenses,"#E67E22","✅"],
              ].map(([label,val,color,icon])=>(
                <div key={label} style={{background:"#fff",borderRadius:16,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",borderTop:`4px solid ${color}`}}>
                  <div style={{fontSize:28,marginBottom:6}}>{icon}</div>
                  <div style={{fontFamily:"'Fredoka One',cursive",fontSize:28,color}}>{val}</div>
                  <div style={{fontSize:12,color:"#AAA",marginTop:4}}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#fff",borderRadius:16,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
              <div style={{fontFamily:"'Fredoka One',cursive",fontSize:18,color:"#1A1A2E",marginBottom:14}}>License Usage</div>
              <div style={{height:12,background:"#EEF0F4",borderRadius:6,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${totalLicenses?usedLicenses/totalLicenses*100:0}%`,background:"linear-gradient(90deg,#0984E3,#6C5CE7)",borderRadius:6,transition:"width 0.5s"}}/>
              </div>
              <div style={{fontSize:13,color:"#AAA",marginTop:8}}>{usedLicenses} of {totalLicenses} licenses assigned</div>
            </div>
          </div>
        )}

        {!loading&&tab==="teachers"&&(
          <div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,color:"#1A1A2E",marginBottom:20}}>Teachers ({teachers.length})</div>
            {teachers.length===0&&<div style={{textAlign:"center",padding:32,color:"#CCC"}}>No teachers yet in this district.</div>}
            {teachers.map(t=>{
              const stuCount=students.filter(s=>s.teacher_id===t.id).length;
              return(
                <div key={t.id} style={{background:"#fff",borderRadius:14,padding:"14px 18px",marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,0.05)",display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:"#0984E322",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>👤</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:900,fontSize:15,color:"#1A1A2E"}}>{t.name}</div>
                    <div style={{fontSize:12,color:"#AAA"}}>{t.email}</div>
                  </div>
                  <div style={{textAlign:"center",padding:"6px 14px",background:"#F4F6FB",borderRadius:10}}>
                    <div style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#0984E3"}}>{stuCount}</div>
                    <div style={{fontSize:10,color:"#AAA"}}>students</div>
                  </div>
                  <div style={{textAlign:"right",fontSize:11,color:"#CCC"}}>Last login<br/>{t.last_login?new Date(t.last_login).toLocaleDateString():"Never"}</div>
                </div>
              );
            })}
          </div>
        )}

        {!loading&&tab==="students"&&(
          <div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,color:"#1A1A2E",marginBottom:20}}>Students ({students.length})</div>
            {students.length===0&&<div style={{textAlign:"center",padding:32,color:"#CCC"}}>No students yet in this district.</div>}
            {students.map(s=>{
              const teacher=teachers.find(t=>t.id===s.teacher_id);
              return(
                <div key={s.id} style={{background:"#fff",borderRadius:14,padding:"12px 16px",marginBottom:8,boxShadow:"0 2px 8px rgba(0,0,0,0.05)",display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:38,height:38,borderRadius:"50%",background:(s.color||"#0984E3")+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{s.avatar||"🎓"}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:900,fontSize:14,color:"#1A1A2E"}}>{s.name}</div>
                    <div style={{fontSize:11,color:"#AAA"}}>Teacher: {teacher?.name||"Unassigned"} · Level {s.current_level}</div>
                  </div>
                  <div style={{padding:"4px 10px",borderRadius:20,background:"#F4F6FB",fontSize:11,fontWeight:800,color:"#666"}}>Level {s.current_level}</div>
                </div>
              );
            })}
          </div>
        )}

        {!loading&&tab==="licenses"&&(
          <div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:24,color:"#1A1A2E",marginBottom:20}}>License Management</div>
            <div style={{background:"#EEF9FF",borderRadius:14,padding:16,marginBottom:20,border:"1px solid #BEE3F8"}}>
              <div style={{fontWeight:800,fontSize:13,color:"#2B6CB0",marginBottom:4}}>ℹ️ How licenses work</div>
              <div style={{fontSize:13,color:"#2C5282",lineHeight:1.6}}>Each license can be assigned to one teacher. When a teacher leaves, reassign their license to a new teacher — all student data transfers automatically.</div>
            </div>
            {licenses.map(l=>{
              const teacher=teachers.find(t=>t.id===l.assigned_to_teacher_id);
              return(
                <div key={l.id} style={{background:"#fff",borderRadius:14,padding:"14px 18px",marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,0.05)",display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:l.status==="active"?"#2ECC71":"#BDC3C7",flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:14,color:"#1A1A2E"}}>{teacher?teacher.name:"Unassigned"}</div>
                    <div style={{fontSize:11,color:"#AAA"}}>{teacher?teacher.email:"Available to assign"} · {l.status}</div>
                  </div>
                  {l.assigned_date&&<div style={{fontSize:11,color:"#CCC"}}>Since {new Date(l.assigned_date).toLocaleDateString()}</div>}
                  <button style={{padding:"6px 12px",borderRadius:8,border:"2px solid #0984E3",background:"#fff",color:"#0984E3",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12,cursor:"pointer"}}>
                    {l.status==="active"?"Reassign":"Assign"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────
export default function SaySee(){
  const [user,setUser]           = useState(null);
  const [loading,setLoading]     = useState(true);
  const [masterWords,setMasterWords] = useState([...MASTER_WORDS]);

  // Check for existing session on load
  useEffect(()=>{
    const checkSession = async () => {
      try {
        const session = await sbAuth.getSession();
        if (session) {
          const acct = await sbAuth.getAccount(session.user.id);
          if (acct) setUser(acct);
          else setUser({ id:session.user.id, email:session.user.email, name:session.user.user_metadata?.name||session.user.email, role:session.user.user_metadata?.role||"teacher", plan:session.user.user_metadata?.plan||"monthly", maxStudents:28 });
        }
      } catch(e) { console.log("Session check failed - using demo mode"); }
      setLoading(false);
    };
    checkSession();
  },[]);

  // Load master words from Supabase if available
  useEffect(()=>{
    const loadWords = async () => {
      try {
        const words = await sbData.getWords();
        if (words.length > 0) setMasterWords(words.map(w=>({...w, cat:w.category, triggers:w.triggers||[w.word]})));
      } catch(e) { console.log("Using built-in word list"); }
    };
    loadWords();
  },[]);

  const login = async (email, password, setErr) => {
    try {
      const { user:u } = await sbAuth.signIn(email, password);
      const acct = await sbAuth.getAccount(u.id);
      setUser(acct || { id:u.id, email:u.email, name:u.user_metadata?.name||email, role:u.user_metadata?.role||"teacher", plan:"monthly", maxStudents:28 });
    } catch(e) {
      // Fall back to demo accounts for testing
      const demo = [...DEMO_ACCOUNTS].find(a=>a.email===email&&a.password===password);
      if (demo) setUser(demo);
      else setErr(e.message||"Invalid email or password.");
    }
  };

  const logout = async () => { await sbAuth.signOut(); setUser(null); };

  const register = async (name, email, password, plan, setErr) => {
    try {
      await sbAuth.signUp(email, password, name, plan);
      setUser({ id:`u_${Date.now()}`, email, name, role:"teacher", plan, maxStudents:28 });
    } catch(e) { setErr(e.message||"Registration failed. Please try again."); }
  };

  if (loading) return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0F0C29,#302B63)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:20}}>
      <div style={{fontFamily:"'Fredoka One',cursive",fontSize:42,color:"#fff",letterSpacing:2}}>👁️ SaySee</div>
      <div style={{fontFamily:"'Nunito',sans-serif",fontSize:14,color:"rgba(255,255,255,0.5)"}}>Loading…</div>
    </div>
  );

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#F4F6FB;}
        @keyframes popIn   {from{transform:scale(0.75);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes fadeUp  {from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes slideR  {from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes micGlow {0%,100%{box-shadow:0 0 0 4px #2ECC7133}50%{box-shadow:0 0 0 11px #2ECC7115}}
        @keyframes mPulse  {0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.3;transform:scale(1.7)}}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:#DDD;border-radius:4px}
      `}</style>
      {!user
        ?<AuthScreen onLogin={login} onRegister={register}/>
        :user.role==="admin"
          ?<AdminPanel words={masterWords} setWords={setMasterWords} onLogout={logout}/>
          :user.role==="district_admin"
            ?<DistrictAdminPanel user={user} onLogout={logout}/>
            :<TeacherApp user={user} words={masterWords} onLogout={logout}/>
      }
    </>
  );
}
