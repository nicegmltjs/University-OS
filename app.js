import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const cfg=window.UNIVERSITY_OS_CONFIG||{};
const $=id=>document.getElementById(id);
const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const defaults=()=>({settings:{semester:"",start:"",end:"",theme:"sage",dark:false},courses:[],tasks:[],journals:[],materials:[]});
const caps={journals:20};
let supa=null,user=null,plan="free",workspace=defaults(),page="home",busy=false,editing=null;
const isPro=()=>plan==="pro";
const uid=()=>crypto.randomUUID();
const cur=()=>new Date().toLocaleDateString("sv-SE");
function message(text,type="error"){const el=$("message");if(el){el.textContent=text;el.className=type;}}
function authView(){const ready=!!(cfg.supabaseUrl&&cfg.supabaseAnonKey);
 $("app").classList.add("hidden");$("auth").classList.remove("hidden");
 $("auth").innerHTML='<div class="card"><h1>✳ University OS</h1><p class="muted">나만의 대학 생활을 한곳에서 관리하세요.</p>'+(ready?'<form id="authform"><label class="field">이메일<input id="email" type="email" required autocomplete="email"></label><label class="field">비밀번호<input id="password" type="password" minlength="6" required autocomplete="current-password"></label><div class="actions"><button class="btn" type="submit" value="login">로그인</button><button class="btn alt" type="button" id="signup">회원가입</button></div></form><p class="muted">회원가입 시 이메일 확인이 필요할 수 있습니다.</p>':'<p class="notice">아직 서비스 설정이 완료되지 않았습니다. 운영자가 Supabase 연결 정보를 등록하면 회원가입과 로그인을 이용할 수 있습니다.</p>')+'<p id="message" aria-live="polite"></p></div>';
 if(!ready)return;
 $("authform").onsubmit=async e=>{e.preventDefault();await authenticate(false);};
 $("signup").onclick=()=>authenticate(true);
}
async function authenticate(create){const email=$("email").value.trim(),password=$("password").value;
 if(!email||password.length<6){message("이메일과 6자 이상 비밀번호를 입력해 주세요.");return;}
 const {error}=create?await supa.auth.signUp({email,password}):await supa.auth.signInWithPassword({email,password});
 if(error){message(error.message);return;}
 if(create){message("가입 요청이 접수되었습니다. 이메일 인증이 설정돼 있다면 메일을 확인해 주세요.","success");return;}
 await enter();
}
async function enter(){const {data:{user:u}}=await supa.auth.getUser();user=u;if(!user){authView();return;}
 const {data:space,error}=await supa.from("workspaces").select("data").eq("user_id",user.id).maybeSingle();
 if(error){authView();message("데이터 조회 실패: "+error.message);return;}
 workspace=space?.data&&Array.isArray(space.data.courses)?space.data:defaults();
 const {data:ent, error:entError}=await supa.from("entitlements").select("plan,expires_at").eq("user_id",user.id).maybeSingle();
 if(entError){authView();message("구독 상태를 확인할 수 없습니다.");return;}
 plan=ent?.plan==="pro"&&(!ent.expires_at||new Date(ent.expires_at)>new Date())?"pro":"free";
 $("auth").classList.add("hidden");$("app").classList.remove("hidden");render();
}
async function persist(){if(busy)return false;busy=true;
 try{const {error}=await supa.from("workspaces").upsert({user_id:user.id,data:workspace},{onConflict:"user_id"});if(error)throw error;return true;}
 catch(err){alert("저장 실패: "+err.message);return false;}finally{busy=false;}}
const limits=(k)=>isPro()||!(k in caps)?"무제한":caps[k];
const atLimit=k=>!isPro()&&(k in caps)&&workspace[k].length>=caps[k];
function gate(k){if(atLimit(k)){alert("FREE "+({courses:"과목",tasks:"과제",journals:"강의 기록",materials:"자료"}[k])+"은 최대 "+caps[k]+"개입니다. PRO에서 제한을 해제할 수 있습니다.");page="plans";render();return false;}return true;}
function nav(){return [["home","홈"],["courses","과목·시간표"],["tasks","과제·시험"],["journals","강의 기록"],["materials","자료실"],["calendar","캘린더"],["settings","설정"],["plans","요금제"]].map(([k,t])=>'<button class="nav '+(k===page?'active':'')+'" data-page="'+k+'">'+t+'</button>').join("");}
function title(t,sub){$("heading").textContent=t;$("eyebrow").textContent=sub||"";}
function courseName(id){return workspace.courses.find(x=>x.id===id)?.name||"기타";}
const choices=(selected)=>'<option value="">과목 선택</option>'+workspace.courses.map(c=>'<option value="'+safe(c.id)+'" '+(selected===c.id?'selected':'')+'>'+safe(c.name)+'</option>').join("");
const action=(name,id,label,warning=false)=>'<button class="btn '+(warning?'warn':'alt')+'" data-action="'+name+'" data-id="'+safe(id)+'">'+label+'</button>';
function render(){
 document.body.dataset.theme=workspace.settings.theme||"sage";document.body.dataset.dark=!!workspace.settings.dark;
 $("nav").innerHTML=nav();$("plan").textContent=isPro()?"PRO":"FREE";
 const pages={home,courses,tasks,journals,materials,calendar,settings,plans};
 $("content").innerHTML=(pages[page]||home)();
}
function home(){title("My University","오늘의 학업 현황");const due=workspace.tasks.filter(x=>!x.done&&x.date>=cur()).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
 return '<div class="cards"><div class="card"><h3>이번 학기</h3><p>'+safe(workspace.settings.semester||"학기를 설정해 주세요")+'</p></div><div class="card"><h3>등록한 과목</h3><p>'+workspace.courses.length+'개</p></div><div class="card"><h3>미완료 과제</h3><p>'+workspace.tasks.filter(x=>!x.done).length+'개</p></div></div><section class="card"><h3>가까운 마감</h3>'+ (due.map(t=>'<div class="item"><div><b>'+safe(t.title)+'</b><p class="muted">'+safe(t.date)+' · '+safe(courseName(t.course_id))+'</p></div>'+action("toggle",t.id,"완료")+'</div>').join("")||'<p class="muted">등록된 일정이 없습니다.</p>')+'</section><div class="actions"><button class="btn" data-page="tasks">+ 과제 등록</button><button class="btn alt" data-page="courses">과목 설정</button></div>';}
function courses(){
 title("과목 및 시간표","과목을 등록하면 주간 시간표에 자동으로 표시됩니다");
 const days=["일","월","화","수","목","금","토"];
 const weekdayOptions=[1,2,3,4,5,6,0].map(d=>'<option value="'+d+'">'+days[d]+'요일</option>').join("");
 const editor='<section class="card"><h3>새 과목 등록 · '+workspace.courses.length+'/'+limits("courses")+'</h3><form id="courseForm"><div class="course-form"><label class="field">과목 이름<input name="name" required maxlength="60" placeholder="예: 미적분학"></label><label class="field">강의실<input name="room" placeholder="선택사항"></label><label class="field">수업 요일<select name="day" required>'+weekdayOptions+'</select></label><label class="field">시작 시간<input name="start" type="time" required value="09:00"></label><label class="field">종료 시간<input name="end" type="time" required value="10:15"></label></div><p class="muted">주 2회 이상 수업이라면 과목을 등록한 뒤 아래에서 수업 시간을 추가하세요.</p><button class="btn" type="submit">+ 과목 및 시간표 등록</button></form></section>';
 const list='<section class="card"><h3>내 과목</h3>'+(workspace.courses.map(c=>'<div class="item"><div><b>'+safe(c.name)+'</b><p class="muted">'+safe(c.room||"강의실 미설정")+'</p>'+(c.meetings||[]).map((m,i)=>'<div class="meeting-line">'+safe(days[m.day]+'요일 '+m.start+'–'+m.end)+' '+action("editmeeting",c.id+":"+i,"시간 수정")+' '+action("delmeeting",c.id+":"+i,"×",true)+'</div>').join("")+'</div><div class="actions">'+action("meeting",c.id,"+ 시간 추가")+action("editcourse",c.id,"과목명 수정")+action("delcourse",c.id,"삭제",true)+'</div></div>').join("")||'<p class="muted">아직 등록된 과목이 없습니다.</p>')+'</section>';
 return editor+timetableView()+list;
}
function timetableView(){
 const days=[1,2,3,4,5,6,0],names=["일","월","화","수","목","금","토"];
 const entries=workspace.courses.flatMap((c,i)=>(c.meetings||[]).map((m,j)=>({course:c,meeting:m,index:j,color:["#d8e9dd","#dce8f8","#f1ddeb","#f8e7d6","#e3ddf3","#e4eee1","#f6e6df"][i%7]})));
 const toMin=t=>{const p=String(t).split(":").map(Number);return p[0]*60+p[1];};
 const valid=entries.filter(x=>Number.isInteger(x.meeting.day)&&/^\d\d:\d\d$/.test(x.meeting.start)&&/^\d\d:\d\d$/.test(x.meeting.end)&&toMin(x.meeting.end)>toMin(x.meeting.start));
 const first=valid.length?Math.max(6,Math.floor(Math.min(...valid.map(x=>toMin(x.meeting.start)))/60)):9;
 const last=valid.length?Math.min(24,Math.ceil(Math.max(...valid.map(x=>toMin(x.meeting.end)))/60)):18;
 const height=(last-first)*64;
 const hours=Array.from({length:last-first+1},(_,i)=>'<div class="tt-hour" style="top:'+i*64+'px">'+String(first+i).padStart(2,"0")+':00</div>').join("");
 const collisions=new Set();
 for(let i=0;i<valid.length;i++)for(let j=i+1;j<valid.length;j++){
  const a=valid[i],b=valid[j];
  if(a.meeting.day===b.meeting.day&&toMin(a.meeting.start)<toMin(b.meeting.end)&&toMin(b.meeting.start)<toMin(a.meeting.end)){
   collisions.add(a.course.id+":"+a.index);collisions.add(b.course.id+":"+b.index);
  }
 }
 const collisionNotice=collisions.size?'<p class="notice" role="status">시간이 겹치는 수업이 '+collisions.size+'개 있습니다. 시간표에서 붉은 테두리로 표시했습니다.</p>':"";
 const columns=days.map(d=>'<div class="tt-column"><div class="tt-day">'+names[d]+'</div><div class="tt-lane" style="height:'+height+'px">'+
 valid.filter(x=>x.meeting.day===d).map(x=>{const top=(toMin(x.meeting.start)-first*60)*64/60,len=(toMin(x.meeting.end)-toMin(x.meeting.start))*64/60;return '<div class="tt-event" style="top:'+top+'px;height:'+Math.max(26,len-2)+'px;background:'+x.color+';border-left-color:'+(collisions.has(x.course.id+":"+x.index)?"#bd3e4b":"#6a9a78")+'" title="'+safe(x.course.name+' · '+x.meeting.start+'–'+x.meeting.end)+'"><b>'+safe(x.course.name)+'</b><small>'+safe(x.meeting.start+'–'+x.meeting.end)+'</small><small>'+safe(x.course.room||"")+'</small></div>';}).join("")+
 '</div></div>').join("");
 return '<section class="card"><h3>주간 시간표</h3><p class="muted">등록한 수업이 요일과 시간에 맞게 배치됩니다. 모바일에서는 좌우로 스크롤하세요.</p>'+collisionNotice+'<div class="tt-scroll"><div class="tt-layout"><div class="tt-times"><div class="tt-day">시간</div><div class="tt-time-lane" style="height:'+height+'px">'+hours+'</div></div>'+columns+'</div></div></section>';
}
function tasks(){
 title("과제 및 시험","할 일과 마감 관리");
 const entry=editing?.kind==="tasks"?workspace.tasks.find(t=>t.id===editing.id):null;
 const kinds=[["task","과제"],["exam","시험"]];
 return '<section class="card"><h3>'+(entry?"일정 수정":"새 일정")+' · '+workspace.tasks.length+'/'+limits("tasks")+'</h3><form id="taskForm"><div class="field"><label>제목<input name="title" required maxlength="120" value="'+safe(entry?.title||"")+'"></label></div><div class="cards"><label class="field">과목<select name="course_id">'+choices(entry?.course_id)+'</select></label><label class="field">마감일<input name="date" type="date" required value="'+safe(entry?.date||cur())+'"></label><label class="field">구분<select name="kind">'+kinds.map(([v,t])=>'<option value="'+v+'" '+((entry?.kind||"task")===v?"selected":"")+'>'+t+'</option>').join("")+'</select></label></div><div class="actions"><button class="btn">'+(entry?"변경 저장":"일정 추가")+'</button>'+(entry?'<button type="button" class="btn alt" data-action="cancelEdit">취소</button>':"")+'</div></form></section><section class="card"><h3>등록한 일정</h3>'+ (workspace.tasks.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(t=>'<div class="item"><div><b style="'+(t.done?'text-decoration:line-through':'')+'">'+safe(t.title)+'</b><p class="muted">'+safe(t.date)+' · '+safe(courseName(t.course_id))+' · '+(t.kind==="exam"?"시험":"과제")+'</p></div><div class="actions">'+action("toggle",t.id,t.done?"미완료":"완료")+action("edittask",t.id,"수정")+action("deltask",t.id,"삭제",true)+'</div></div>').join("")||'<p class="muted">아직 등록한 일정이 없습니다.</p>')+'</section>';
}
function journals(){
 title("Lecture Journal","수업 기록과 복습");
 const entry=editing?.kind==="journals"?workspace.journals.find(j=>j.id===editing.id):null;
 return '<section class="card"><h3>'+(entry?"강의 기록 수정":"강의 기록 추가")+' · '+workspace.journals.length+'/'+limits("journals")+'</h3><form id="journalForm"><div class="cards"><label class="field">과목<select name="course_id">'+choices(entry?.course_id)+'</select></label><label class="field">날짜<input name="date" type="date" required value="'+safe(entry?.date||cur())+'"></label></div><label class="field">제목<input name="title" maxlength="100" required value="'+safe(entry?.title||"")+'"></label><label class="field">내용<textarea name="body" required>'+safe(entry?.body||"")+'</textarea></label><div class="actions"><button class="btn">'+(entry?"변경 저장":"기록 저장")+'</button>'+(entry?'<button type="button" class="btn alt" data-action="cancelEdit">취소</button>':"")+'</div></form></section><section class="card"><h3>내 기록</h3>'+workspace.journals.slice().reverse().map(j=>'<div class="item"><div><b>'+safe(j.title)+'</b><p class="muted">'+safe(j.date)+' · '+safe(courseName(j.course_id))+'</p><p style="white-space:pre-wrap">'+safe(j.body)+'</p></div><div class="actions">'+action("editjournal",j.id,"수정")+action("deljournal",j.id,"삭제",true)+'</div></div>').join("")+'</section>';
}
function materials(){
 title("Materials","자료 링크 모아보기");
 const entry=editing?.kind==="materials"?workspace.materials.find(m=>m.id===editing.id):null;
 return '<section class="card"><h3>'+(entry?"자료 수정":"자료 링크 추가")+' · '+workspace.materials.length+'/'+limits("materials")+'</h3><form id="materialForm"><label class="field">자료명<input name="title" required maxlength="120" value="'+safe(entry?.title||"")+'"></label><label class="field">링크<input name="url" type="url" required placeholder="https://" value="'+safe(entry?.url||"")+'"></label><label class="field">과목<select name="course_id">'+choices(entry?.course_id)+'</select></label><div class="actions"><button class="btn">'+(entry?"변경 저장":"자료 등록")+'</button>'+(entry?'<button type="button" class="btn alt" data-action="cancelEdit">취소</button>':"")+'</div></form></section><section class="card"><h3>자료실</h3>'+workspace.materials.map(m=>'<div class="item"><div><b>'+safe(m.title)+'</b><p class="muted">'+safe(courseName(m.course_id))+'</p><a target="_blank" rel="noopener noreferrer" href="'+safe(/^https?:\/\//i.test(m.url)?m.url:"#")+'">자료 열기</a></div><div class="actions">'+action("editmaterial",m.id,"수정")+action("delmaterial",m.id,"삭제",true)+'</div></div>').join("")+'</section>';
}
function calendar(){title("Calendar","날짜별 일정");const now=new Date(),first=new Date(now.getFullYear(),now.getMonth(),1),last=new Date(now.getFullYear(),now.getMonth()+1,0),days=Array.from({length:(first.getDay()+6)%7},()=>'<div></div>');for(let d=1;d<=last.getDate();d++){const date=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');days.push('<div class="day '+(date===cur()?'today':'')+'"><strong>'+d+'</strong>'+workspace.tasks.filter(t=>t.date===date).map(t=>'<div>'+safe(t.title)+'</div>').join("")+'</div>')}return '<section class="card"><h3>'+now.getFullYear()+'년 '+(now.getMonth()+1)+'월</h3><div class="calendar-grid">'+["월","화","수","목","금","토","일"].map(x=>'<b>'+x+'</b>').join("")+days.join("")+'</div></section>';}
function settings(){title("설정","학기·개인화·데이터");return '<section class="card"><h3>내 학기</h3><form id="settingsForm"><label class="field">학기 이름<input name="semester" required value="'+safe(workspace.settings.semester)+'" placeholder="예: 2027년 1학기"></label><div class="cards"><label class="field">시작일<input type="date" name="start" value="'+safe(workspace.settings.start)+'"></label><label class="field">종료일<input type="date" name="end" value="'+safe(workspace.settings.end)+'"></label></div><label class="field">테마<select name="theme">'+["sage","rose","peach","lavender","blue","mono"].filter(x=>isPro()||["sage","mono"].includes(x)).map(x=>'<option '+(workspace.settings.theme===x?'selected':'')+' value="'+x+'">'+({sage:"Sage Mint",rose:"Soft Rose",peach:"Peach Cream",lavender:"Misty Lavender",blue:"Cloud Blue",mono:"Monotone"}[x])+'</option>').join("")+'</select></label><label><input type="checkbox" name="dark" '+(workspace.settings.dark?'checked':'')+'> 다크 모드</label><p><button class="btn">설정 저장</button></p></form></section><section class="card"><h3>데이터 백업</h3><p class="muted">내 데이터를 JSON 파일로 저장합니다. 중요한 기록은 별도로 보관하세요.</p><div class="actions"><button class="btn alt" id="export">JSON 내보내기</button><label class="btn alt" for="importfile">JSON 가져오기</label><input type="file" id="importfile" accept="application/json" hidden></div></section><section class="card"><h3>계정</h3><p class="muted">'+safe(user?.email)+'</p><button class="btn warn" id="deleteaccount">계정 삭제 요청 안내</button></section>';}
function plans(){title("FREE / PRO","내게 맞는 이용 방식");return '<div class="cards"><section class="card"><h2>FREE · 0원</h2><p>과목·시간표·과제·시험·자료 링크 무제한 · 강의 기록 20개</p><p>테마 2개 · 백업/복원 제공</p></section><section class="card"><h2>PRO · 학기당 '+Number(cfg.priceKrw||7900).toLocaleString('ko-KR')+'원</h2><p>모든 항목 개수 제한 해제 · 테마 6종</p><button class="btn" id="checkout" '+(!cfg.paymentEnabled?'disabled':'')+'>PRO 구매</button><p class="muted">'+(cfg.paymentEnabled?"결제 페이지로 이동합니다.":"결제 서비스 설정 후 구매할 수 있습니다.")+'</p></section></div>';}
async function change(kind,entry,del=false){const prev=structuredClone(workspace);if(del)workspace[kind]=workspace[kind].filter(x=>x.id!==entry.id);else workspace[kind].push(entry);
 if(!(await persist())){workspace=prev;}render();}
document.addEventListener("click",async e=>{
 const pg=e.target.closest("[data-page]");if(pg){editing=null;page=pg.dataset.page;render();return;}
 const el=e.target.closest("[data-action]");if(!el)return;const act=el.dataset.action,id=el.dataset.id;
 if(act==="cancelEdit"){editing=null;render();return;}
 if(["edittask","editjournal","editmaterial"].includes(act)){editing={kind:act==="edittask"?"tasks":act==="editjournal"?"journals":"materials",id};page=editing.kind;render();window.scrollTo(0,0);return;}
 const kind=act.includes("course")||act.includes("meeting")?"courses":act.includes("task")||act==="toggle"?"tasks":act.includes("journal")?"journals":"materials";
 const item=workspace[kind]?.find(x=>x.id===id.split(":")[0]);if(!item)return;
 if(act==="toggle"){item.done=!item.done;if(!(await persist()))item.done=!item.done;render();return;}
 if(act==="meeting"||act==="editmeeting"||act==="delmeeting"){
 const parts=id.split(":"),target=workspace.courses.find(x=>x.id===parts[0]),index=Number(parts[1]);if(!target)return;
 if(act==="delmeeting"){if(!confirm("이 수업 시간만 삭제할까요?"))return;target.meetings.splice(index,1);await persist();render();return;}
 const prev=act==="editmeeting"?target.meetings[index]:{day:1,start:"09:00",end:"10:15"};
 if(!prev)return;
 const day=prompt("요일 (0=일, 1=월, ..., 6=토)",String(prev.day));
 if(day===null)return;
 const start=prompt("시작 시간 (HH:MM)",prev.start);if(start===null)return;
 const end=prompt("종료 시간 (HH:MM)",prev.end);if(end===null)return;
 if(!/^[0-6]$/.test(day)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(end)||end<=start){alert("요일 또는 시작·종료 시간을 확인하세요.");return;}
 if(act==="editmeeting")target.meetings[index]={day:Number(day),start,end};
 else target.meetings=[...(target.meetings||[]),{day:Number(day),start,end}];
 await persist();render();return;
 }
 if(act.startsWith("del")){if(!confirm("정말 삭제할까요?"))return;editing=null;await change(kind,item,true);return;}
 if(act==="editcourse"){const name=prompt("과목 이름",item.name);if(name===null)return;if(!name.trim()){alert("과목 이름을 입력해 주세요.");return;}const room=prompt("강의실 (선택)",item.room||"");if(room===null)return;const old={name:item.name,room:item.room};item.name=name.trim();item.room=room.trim();if(!(await persist()))Object.assign(item,old);render();}
});
document.addEventListener("submit",async e=>{const form=e.target;if(!["courseForm","taskForm","journalForm","materialForm","settingsForm"].includes(form.id))return;
 e.preventDefault();const values=Object.fromEntries(new FormData(form).entries());
 if(form.id==="settingsForm"){const old=structuredClone(workspace.settings);workspace.settings={...workspace.settings,...values,dark:!!form.elements.dark.checked};if(!isPro()&&!["sage","mono"].includes(workspace.settings.theme))workspace.settings.theme="sage";if(!(await persist()))workspace.settings=old;render();return;}
 const kind=({courseForm:"courses",taskForm:"tasks",journalForm:"journals",materialForm:"materials"})[form.id];
 const current=editing?.kind===kind?workspace[kind].find(x=>x.id===editing.id):null;
 if(!current&&!gate(kind))return;
 if(kind==="courses"){const {day,start,end}=values;if(!/^[0-6]$/.test(day)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(end)||end<=start){alert("수업 시간을 확인해 주세요.");return;}}
 if(kind==="materials"&&!/^https?:\/\//i.test(values.url)){alert("http 또는 https 링크만 등록할 수 있습니다.");return;}
 if(current){const before=structuredClone(current);Object.assign(current,values);if(!(await persist()))Object.assign(current,before);editing=null;render();return;}
 await change(kind,{id:uid(),...values,...(kind==="courses"?{meetings:[{day:Number(values.day),start:values.start,end:values.end}]}:{}),...(kind==="tasks"?{done:false}:{})});});
document.addEventListener("click",async e=>{
 if(e.target.id==="logout"){await supa.auth.signOut();user=null;workspace=defaults();plan="free";authView();}
 if(e.target.id==="export"){const blob=new Blob([JSON.stringify({version:2,data:workspace},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="university-os-backup.json";a.click();URL.revokeObjectURL(url);}
 if(e.target.id==="deleteaccount")alert("계정 및 서버 데이터 삭제 요청은 운영자에게 문의해 주세요. 셀프 삭제 기능은 정식 출시 전에 제공됩니다.");
 if(e.target.id==="checkout"){if(!cfg.paymentEnabled)return;const {data,error}=await supa.functions.invoke("create-checkout",{body:{}});if(error||!data?.checkoutUrl){alert("결제 시작 실패: "+(error?.message||"설정 확인 필요"));return;}location.href=data.checkoutUrl;}
});
document.addEventListener("change",async e=>{if(e.target.id!=="importfile")return;const file=e.target.files[0];if(!file)return;try{const parsed=JSON.parse(await file.text()),d=parsed.data;if(!d||!["courses","tasks","journals","materials"].every(k=>Array.isArray(d[k])))throw Error("파일 형식 오류");if(!isPro()&&Object.keys(caps).some(k=>d[k].length>caps[k]))throw Error("무료 이용 개수 제한을 초과한 백업 파일입니다.");if(!confirm("현재 데이터를 백업 데이터로 바꿀까요?"))return;const old=workspace;workspace=d;if(!(await persist()))workspace=old;render();}catch(err){alert(err.message)}});
async function init(){if(!cfg.supabaseUrl||!cfg.supabaseAnonKey){authView();return;}try{supa=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);const {data:{session}}=await supa.auth.getSession();if(session)await enter();else authView();supa.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT"){user=null;authView();}});}catch(err){authView();message(err.message);}}
init();