import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { 
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    signOut, onAuthStateChanged 
} from 'firebase/auth';
import { 
    getDatabase, ref, set, get, onValue, update 
} from 'firebase/database';
import confetti from 'canvas-confetti';

// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDL6yuft4kzYubNsGqVDUOcDr-3gyHu4ys",
  authDomain: "sa-math.firebaseapp.com",
  databaseURL: "https://sa-math-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sa-math",
  storageBucket: "sa-math.firebasestorage.app",
  messagingSenderId: "899021994243",
  appId: "1:899021994243:web:4aed548957fce530989136",
  measurementId: "G-0W2Z7V8SJ7"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getDatabase(app);

// ==========================================
// 2. MAIN APP COMPONENT
// ==========================================
export default function MathGameApp() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [view, setView] = useState('login'); 
    const [isLandscape, setIsLandscape] = useState(true);
    
    // Game State
    const [selectedMap, setSelectedMap] = useState(1);
    const [selectedLevel, setSelectedLevel] = useState(1);
    const [levelData, setLevelData] = useState(null);
    const [allLevels, setAllLevels] = useState({});
    const [userProgress, setUserProgress] = useState({});
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        const checkOrientation = () => setIsLandscape(window.innerWidth > window.innerHeight);
        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const userRef = ref(db, `users/${currentUser.uid}`);
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    setUserData(snapshot.val());
                } else {
                    const role = currentUser.email === 'admin@math.com' ? 'admin' : 'player';
                    const newUserData = { 
                        email: currentUser.email, 
                        totalStars: 0, 
                        role: role,
                        displayName: currentUser.email.split('@')[0]
                    };
                    await set(userRef, newUserData);
                    setUserData(newUserData);
                }
                setView('menu');
            } else {
                setView('login');
                setUserData(null);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;
        const levelsRef = ref(db, 'levels');
        const unsubLevels = onValue(levelsRef, (snapshot) => {
            if (snapshot.exists()) setAllLevels(snapshot.val());
            else setAllLevels({});
        });

        const progressRef = ref(db, `users/${user.uid}/progress`);
        const unsubProgress = onValue(progressRef, (snapshot) => {
            if (snapshot.exists()) setUserProgress(snapshot.val());
            else setUserProgress({});
        });

        const usersRef = ref(db, 'users');
        const unsubLeaderboard = onValue(usersRef, (snapshot) => {
            let usersList = [];
            if (snapshot.exists()) {
                const data = snapshot.val();
                for (let uid in data) {
                    if (data[uid].totalStars > 0) usersList.push({ id: uid, ...data[uid] });
                }
                usersList.sort((a, b) => b.totalStars - a.totalStars);
            }
            setLeaderboard(usersList);
        });

        return () => { unsubLevels(); unsubProgress(); unsubLeaderboard(); };
    }, [user]);

    const handleSignOut = () => signOut(auth);

    const saveProgress = async (mapId, levelId, starsEarned) => {
        if (!user || !userData) return;
        const levelKey = `map${mapId}_level${levelId}`;
        const previousStars = userProgress[levelKey]?.stars || 0;
        
        if (starsEarned > previousStars) {
            const progressRef = ref(db, `users/${user.uid}/progress/${levelKey}`);
            await set(progressRef, { stars: starsEarned, mapId, levelId });
            
            const starDifference = starsEarned - previousStars;
            const userRef = ref(db, `users/${user.uid}`);
            await update(userRef, { totalStars: userData.totalStars + starDifference });
        }
    };

    if (!isLandscape) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-indigo-500 to-purple-600 text-center p-6 text-white font-['Kanit']">
                <i className="fas fa-mobile-alt text-6xl md:text-8xl mb-4 md:mb-6 animate-pulse"></i>
                <h1 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3 shadow-sm">กรุณาหมุนโทรศัพท์</h1>
                <p className="text-lg md:text-xl opacity-90">ตะแคงจอเป็นแนวนอน เพื่อเข้าสู่เกมครับ</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gradient-to-br from-[#84fab0] to-[#8fd3f4] font-['Kanit'] overflow-hidden relative selection:bg-blue-300">
            {/* Header User Panel */}
            {user && view !== 'play' && view !== 'sandbox' && (
                <div className="absolute top-2 right-2 md:top-4 md:right-4 flex items-center gap-2 md:gap-4 bg-white/80 backdrop-blur-md px-3 py-1 md:px-5 md:py-2 rounded-full shadow-sm border border-white/50 z-50">
                    <div className="text-sm md:text-base font-bold text-gray-800 flex items-center">
                        <i className="fas fa-star text-yellow-500 mr-1 md:mr-2"></i> {userData?.totalStars || 0}
                    </div>
                    <div className="text-xs md:text-sm text-gray-800 border-l-2 pl-2 md:pl-4 border-gray-300 font-medium flex items-center">
                        <i className="fas fa-user-circle text-blue-600 mr-1 md:mr-2"></i> {userData?.displayName}
                    </div>
                    <button onClick={handleSignOut} className="text-red-500 hover:text-red-700 text-xs md:text-sm ml-1 md:ml-3 bg-red-50 hover:bg-red-100 px-2 py-1 md:px-3 md:py-1.5 rounded-full transition-colors">
                        <i className="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            )}

            {view === 'login' && <LoginScreen />}
            {view === 'menu' && <MainMenu setView={setView} isAdmin={userData?.role === 'admin'} />}
            {view === 'mapSelect' && <MapSelect setView={setView} setSelectedMap={setSelectedMap} userProgress={userProgress} />}
            {view === 'levelSelect' && <LevelSelect setView={setView} mapId={selectedMap} setSelectedLevel={setSelectedLevel} setLevelData={setLevelData} allLevels={allLevels} userProgress={userProgress} />}
            {view === 'admin' && <AdminPanel setView={setView} allLevels={allLevels} />}
            {view === 'leaderboard' && <Leaderboard setView={setView} leaderboard={leaderboard} />}
            
            {(view === 'play' || view === 'sandbox') && (
                <GameEngine 
                    view={view} 
                    setView={setView} 
                    levelData={view === 'play' ? levelData : null} 
                    mapId={selectedMap}
                    levelId={selectedLevel}
                    saveProgress={saveProgress}
                />
            )}
        </div>
    );
}

// ==========================================
// UI COMPONENTS
// ==========================================

function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) await signInWithEmailAndPassword(auth, email, password);
            else await createUserWithEmailAndPassword(auth, email, password);
        } catch (err) { setError('ข้อมูลไม่ถูกต้อง หรือรหัสผ่านสั้นเกินไป'); }
    };

    return (
        <div className="flex h-screen items-center justify-center p-2 md:p-4">
            <div className="bg-white/90 backdrop-blur-xl p-6 md:p-10 rounded-[2rem] shadow-xl border border-white max-w-sm w-full text-center relative overflow-hidden">
                <div className="text-5xl md:text-6xl mb-4 text-blue-500"><i className="fas fa-calculator"></i></div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 mb-1">เกมแก้สมการ</h1>
                <h2 className="text-sm md:text-base text-gray-600 font-medium mb-6">โดย ครูจักรวรรดิ ไชยโคตร</h2>
                
                {error && <div className="bg-red-100 text-red-600 p-2 rounded-lg mb-3 text-xs md:text-sm font-semibold">{error}</div>}
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-3 relative z-10">
                    <input type="email" placeholder="อีเมลของคุณ" required value={email} onChange={e => setEmail(e.target.value)}
                        className="px-4 py-2 md:py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-400 outline-none text-sm md:text-base transition-colors" />
                    <input type="password" placeholder="รหัสผ่าน" required value={password} onChange={e => setPassword(e.target.value)}
                        className="px-4 py-2 md:py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-400 outline-none text-sm md:text-base transition-colors" />
                    <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 md:py-3 rounded-xl shadow-md active:translate-y-1 text-base transition-all mt-2">
                        {isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
                    </button>
                </form>
                
                <button onClick={() => setIsLogin(!isLogin)} className="mt-4 md:mt-5 text-sm text-gray-500 font-bold hover:text-blue-600 transition-colors">
                    {isLogin ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
                </button>
            </div>
        </div>
    );
}

function MainMenu({ setView, isAdmin }) {
    return (
        <div className="flex h-screen items-center justify-center p-2 md:p-6">
            <div className="bg-white/90 backdrop-blur-xl p-6 md:p-10 rounded-[2rem] shadow-xl border border-white w-full max-w-3xl text-center">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-6 md:mb-8">
                    <i className="fas fa-gamepad text-blue-500 mr-2 md:mr-3"></i>เลือกโหมดการเล่น
                </h1>
                <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <MenuButton icon="fa-play" text="ลุยด่าน (Campaign)" color="bg-green-500 hover:bg-green-600" onClick={() => setView('mapSelect')} />
                    <MenuButton icon="fa-edit" text="ฝึกฝน (Sandbox)" color="bg-orange-500 hover:bg-orange-600" onClick={() => setView('sandbox')} />
                    <MenuButton icon="fa-trophy" text="ตารางอันดับ" color="bg-yellow-400 hover:bg-yellow-500 text-gray-800" onClick={() => setView('leaderboard')} colSpan={isAdmin ? 1 : 2} />
                    {isAdmin && <MenuButton icon="fa-cogs" text="Admin" color="bg-gray-700 hover:bg-gray-800" onClick={() => setView('admin')} />}
                </div>
            </div>
        </div>
    );
}

function MenuButton({ icon, text, color, onClick, colSpan = 1 }) {
    return (
        <button onClick={onClick} className={`${color} text-white font-bold py-4 px-2 md:py-6 md:px-4 rounded-2xl shadow-md transform transition-transform active:scale-95 text-sm md:text-xl flex flex-col items-center justify-center gap-2 md:gap-3 col-span-${colSpan}`}>
            <i className={`fas ${icon} text-3xl md:text-4xl`}></i> {text}
        </button>
    );
}

function MapSelect({ setView, setSelectedMap, userProgress }) {
    const maps = Array.from({ length: 10 }, (_, i) => i + 1);
    const isMapUnlocked = (m) => m === 1 || (userProgress[`map${m - 1}_level10`]?.stars || 0) > 0;

    return (
        <div className="p-4 md:p-8 h-screen overflow-y-auto">
            <button onClick={() => setView('menu')} className="bg-white/90 px-4 py-2 rounded-full mb-4 md:mb-6 font-bold text-gray-700 shadow-sm text-sm hover:bg-white"><i className="fas fa-chevron-left mr-1"></i> กลับ</button>
            <h1 className="text-2xl md:text-4xl font-extrabold text-gray-800 mb-6 md:mb-8 text-center drop-shadow-sm">เลือก Map</h1>
            <div className="grid grid-cols-5 gap-3 md:gap-5 max-w-5xl mx-auto pb-10">
                {maps.map(mapNum => {
                    const unlocked = isMapUnlocked(mapNum);
                    return (
                        <button key={mapNum} disabled={!unlocked} onClick={() => { setSelectedMap(mapNum); setView('levelSelect'); }}
                            className={`relative flex flex-col items-center justify-center h-20 md:h-28 rounded-xl md:rounded-2xl border-2 transition-all ${unlocked ? 'bg-white border-blue-400 shadow-sm active:scale-95 hover:border-blue-500 cursor-pointer' : 'bg-gray-100 border-gray-200 opacity-70 cursor-not-allowed'}`}>
                            <span className={`text-xs md:text-lg font-bold ${unlocked ? 'text-blue-500' : 'text-gray-400'}`}>Map</span>
                            <span className={`text-xl md:text-3xl font-black ${unlocked ? 'text-blue-600' : 'text-gray-400'}`}>{mapNum}</span>
                            {!unlocked && <div className="absolute inset-0 bg-gray-200/40 rounded-xl md:rounded-2xl flex items-center justify-center"><i className="fas fa-lock text-gray-400 text-lg md:text-2xl"></i></div>}
                        </button>
                    )
                })}
            </div>
        </div>
    );
}

function LevelSelect({ setView, mapId, setSelectedLevel, setLevelData, allLevels, userProgress }) {
    const levels = Array.from({ length: 10 }, (_, i) => i + 1);
    const isLevelUnlocked = (l) => l === 1 || (userProgress[`map${mapId}_level${l - 1}`]?.stars || 0) > 0;

    return (
        <div className="p-4 md:p-8 h-screen overflow-y-auto">
            <button onClick={() => setView('mapSelect')} className="bg-white/90 px-4 py-2 rounded-full mb-4 md:mb-6 font-bold text-gray-700 shadow-sm text-sm hover:bg-white"><i className="fas fa-chevron-left mr-1"></i> กลับ</button>
            <h1 className="text-2xl md:text-4xl font-extrabold text-gray-800 mb-6 md:mb-8 text-center drop-shadow-sm">Map {mapId}</h1>
            <div className="grid grid-cols-5 gap-3 md:gap-5 max-w-5xl mx-auto pb-10">
                {levels.map(lvlNum => {
                    const levelKey = `map${mapId}_level${lvlNum}`;
                    const levelExists = allLevels[levelKey];
                    const unlocked = isLevelUnlocked(lvlNum) && levelExists;
                    const stars = userProgress[levelKey]?.stars || 0;
                    return (
                        <button key={lvlNum} disabled={!unlocked && levelExists} onClick={() => { if(levelExists) { setSelectedLevel(lvlNum); setLevelData(allLevels[levelKey]); setView('play'); } else alert("ยังไม่เปิดให้เล่นครับ"); }}
                            className={`relative flex flex-col items-center justify-center h-24 md:h-32 rounded-xl md:rounded-2xl border-2 transition-all ${unlocked ? 'bg-white border-green-500 shadow-sm active:scale-95 hover:border-green-600 cursor-pointer' : (!levelExists ? 'bg-red-50 border-red-200' : 'bg-gray-100 border-gray-200 opacity-80 cursor-not-allowed')}`}>
                            <span className={`text-2xl md:text-4xl font-black ${unlocked ? 'text-green-600' : 'text-gray-400'}`}>{lvlNum}</span>
                            <div className="flex gap-[1px] md:gap-1 mt-1 md:mt-2 bg-gray-50 px-1.5 py-0.5 rounded-full border border-gray-100">
                                {[1,2,3,4,5].map(star => <i key={star} className={`fas fa-star text-[10px] md:text-xs ${star <= stars ? 'text-yellow-400' : 'text-gray-300'}`}></i>)}
                            </div>
                            {!unlocked && levelExists && <div className="absolute inset-0 flex items-center justify-center bg-gray-200/40 rounded-xl md:rounded-2xl"><i className="fas fa-lock text-gray-400 text-xl md:text-3xl"></i></div>}
                        </button>
                    )
                })}
            </div>
        </div>
    );
}

// ==========================================
// VISUAL EDITOR (Cleaned up, bug-fixed for Admin Panel sync)
// ==========================================
function VisualEditor({ id, label, value, onChange }) {
    const editorRef = useRef(null);

    // Sync from parent (crucial for Admin level switching to work right)
    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const updateReactState = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const insertHTML = (htmlString) => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        let sel = window.getSelection();
        if (sel.rangeCount > 0) {
            let range = sel.getRangeAt(0);
            if (el.contains(range.commonAncestorContainer)) {
                let fragment = range.createContextualFragment(htmlString);
                range.deleteContents();
                let lastNode = fragment.lastChild;
                range.insertNode(fragment);
                if (lastNode) {
                    range.setStartAfter(lastNode);
                    range.setEndAfter(lastNode);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            } else {
                el.insertAdjacentHTML('beforeend', htmlString);
            }
        } else {
            el.insertAdjacentHTML('beforeend', htmlString);
        }
        updateReactState();
    };

    const insertFraction = (e) => {
        e.preventDefault();
        insertHTML(`<span class="editor-node editor-fraction" contenteditable="false"><span class="frac-num" contenteditable="true"></span><div class="frac-line"></div><span class="frac-den" contenteditable="true"></span></span>&nbsp;`);
    };

    const insertText = (e, text) => {
        e.preventDefault();
        insertHTML(text);
    };

    const clearEditor = (e) => {
        e.preventDefault();
        if(editorRef.current) {
            editorRef.current.innerHTML = '';
            updateReactState();
        }
    };

    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex justify-center gap-1.5 md:gap-2 flex-wrap bg-gray-50 p-2 rounded-xl border border-gray-200 shadow-sm">
                <button onMouseDown={insertFraction} onTouchStart={insertFraction} className="bg-white border border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg px-2 py-1 md:px-3 md:py-1.5 font-semibold text-xs md:text-sm transition-colors flex items-center shadow-sm whitespace-nowrap"><i className="fas fa-columns rotate-90 mr-1.5 text-blue-500"></i>เศษส่วน</button>
                <button onMouseDown={e=>insertText(e,'•')} onTouchStart={e=>insertText(e,'•')} className="bg-white border border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg px-2 py-1 md:px-3 md:py-1.5 font-semibold text-xs md:text-sm transition-colors flex items-center shadow-sm whitespace-nowrap"><i className="fas fa-circle text-[8px] mr-1.5 text-purple-500"></i>คูณ(•)</button>
                <button onMouseDown={e=>insertText(e,'x')} onTouchStart={e=>insertText(e,'x')} className="bg-white border border-gray-300 text-green-600 hover:bg-green-50 rounded-lg px-2 py-1 md:px-3 md:py-1.5 font-bold text-xs md:text-sm transition-colors shadow-sm whitespace-nowrap">ตัวแปร x</button>
                <button onMouseDown={e=>insertText(e,'+')} onTouchStart={e=>insertText(e,'+')} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg px-3 py-1 md:px-4 md:py-1.5 font-bold text-xs md:text-sm shadow-sm transition-colors">+</button>
                <button onMouseDown={e=>insertText(e,'-')} onTouchStart={e=>insertText(e,'-')} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg px-3 py-1 md:px-4 md:py-1.5 font-bold text-xs md:text-sm shadow-sm transition-colors">-</button>
                <button onMouseDown={clearEditor} onTouchStart={clearEditor} className="bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-lg px-2 py-1 md:px-3 md:py-1.5 font-bold text-xs md:text-sm shadow-sm transition-colors flex items-center whitespace-nowrap"><i className="fas fa-trash-alt mr-1.5"></i>ล้าง</button>
            </div>
            
            <div className="w-full">
                <label className="block text-gray-600 font-bold mb-1 text-sm md:text-base text-center">{label}</label>
                <div 
                    id={id}
                    ref={editorRef}
                    className="bg-white border-2 border-blue-200 rounded-xl p-3 md:p-4 flex items-center min-h-[60px] md:min-h-[70px] font-['Fredoka'] text-xl md:text-2xl color-gray-800 overflow-x-auto whitespace-nowrap cursor-text outline-none focus:border-blue-400 transition-colors w-full shadow-inner"
                    contentEditable="true"
                    onInput={updateReactState}
                    onBlur={updateReactState}
                    suppressContentEditableWarning={true}
                ></div>
            </div>
        </div>
    );
}

function AdminPanel({ setView, allLevels }) {
    const [mapId, setMapId] = useState(1);
    const [levelId, setLevelId] = useState(1);
    const [lhsHtml, setLhsHtml] = useState('');
    const [rhsHtml, setRhsHtml] = useState('');
    const [parMoves, setParMoves] = useState(3);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const levelKey = `map${mapId}_level${levelId}`;
        const data = allLevels[levelKey];
        if (data) {
            setLhsHtml(data.lhsHtml || ''); setRhsHtml(data.rhsHtml || ''); setParMoves(data.parMoves);
        } else {
            setLhsHtml(''); setRhsHtml(''); setParMoves(3);
        }
        setMessage('');
    }, [mapId, levelId, allLevels]);

    const handleSave = async () => {
        if (!lhsHtml || !rhsHtml) { setMessage('กรุณาสร้างสมการให้ครบ'); return; }
        const levelKey = `map${mapId}_level${levelId}`;
        await set(ref(db, `levels/${levelKey}`), { mapId, levelId, lhsHtml, rhsHtml, parMoves: parseInt(parMoves) });
        setMessage(`บันทึก Map ${mapId} เลเวล ${levelId} เรียบร้อย!`);
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <div className="p-2 md:p-6 h-screen overflow-y-auto flex justify-center items-center">
            <div className="bg-white/95 backdrop-blur-xl p-4 md:p-8 rounded-2xl md:rounded-[2rem] shadow-xl border border-gray-100 w-full max-w-4xl">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h1 className="text-xl md:text-2xl font-extrabold text-gray-800 flex items-center"><i className="fas fa-tools text-gray-500 mr-2 md:mr-3"></i>จัดการด่าน (Admin)</h1>
                    <button onClick={() => setView('menu')} className="bg-gray-100 px-4 py-1.5 rounded-full font-bold text-gray-600 hover:bg-gray-200 text-sm md:text-base transition-colors">กลับเมนู</button>
                </div>
                
                <div className="flex gap-2 md:gap-4 mb-6">
                    <div className="flex-1">
                        <label className="block text-gray-500 font-semibold text-xs md:text-sm mb-1">Map (แผนที่)</label>
                        <select value={mapId} onChange={e => setMapId(parseInt(e.target.value))} className="w-full p-2 rounded-lg border border-gray-300 text-sm md:text-base font-bold bg-white focus:border-blue-400 outline-none">
                            {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={n}>Map {n}</option>)}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-gray-500 font-semibold text-xs md:text-sm mb-1">Level (ด่าน)</label>
                        <select value={levelId} onChange={e => setLevelId(parseInt(e.target.value))} className="w-full p-2 rounded-lg border border-gray-300 text-sm md:text-base font-bold bg-white focus:border-blue-400 outline-none">
                            {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={n}>Level {n}</option>)}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-gray-500 font-semibold text-xs md:text-sm mb-1">เป้าหมาย (ครั้ง)</label>
                        <input type="number" value={parMoves} onChange={e => setParMoves(e.target.value)} min="1" className="w-full p-2 rounded-lg border border-gray-300 text-sm md:text-base font-bold bg-white text-center focus:border-blue-400 outline-none" />
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center w-full mb-6">
                    <div className="w-full md:w-5/12"><VisualEditor id="adminLhs" label="สมการฝั่งซ้าย (LHS)" value={lhsHtml} onChange={setLhsHtml} /></div>
                    <div className="text-3xl md:text-4xl font-black text-gray-400">=</div>
                    <div className="w-full md:w-5/12"><VisualEditor id="adminRhs" label="สมการฝั่งขวา (RHS)" value={rhsHtml} onChange={setRhsHtml} /></div>
                </div>

                {message && <div className={`p-2 md:p-3 rounded-lg mb-4 font-bold text-center text-sm md:text-base ${message.includes('เรียบร้อย') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{message}</div>}

                <button onClick={handleSave} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl text-base md:text-lg shadow-sm transition-colors">
                    <i className="fas fa-save mr-2"></i> บันทึกด่าน
                </button>
            </div>
        </div>
    );
}

function Leaderboard({ setView, leaderboard }) {
    return (
        <div className="p-4 md:p-8 h-screen flex justify-center items-center">
            <div className="bg-white/95 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-xl border border-gray-100 max-w-2xl w-full h-[85vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800"><i className="fas fa-crown text-yellow-500 mr-3"></i>ตารางอันดับ</h1>
                    <button onClick={() => setView('menu')} className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-full font-bold text-sm md:text-base hover:bg-gray-200 transition-colors">กลับ</button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {leaderboard.length === 0 ? (
                        <div className="text-center text-gray-400 mt-10 text-base md:text-lg font-medium">ยังไม่มีข้อมูลผู้เล่น</div>
                    ) : (
                        leaderboard.map((u, index) => (
                            <div key={u.id} className={`flex items-center justify-between p-3 md:p-4 rounded-xl border ${index === 0 ? 'bg-yellow-50 border-yellow-200' : index === 1 ? 'bg-gray-50 border-gray-200' : index === 2 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm md:text-base ${index === 0 ? 'bg-yellow-400 text-white' : index === 1 ? 'bg-gray-400 text-white' : index === 2 ? 'bg-orange-400 text-white' : 'bg-gray-200 text-gray-500'}`}>{index + 1}</div>
                                    <div className="text-base md:text-lg font-bold text-gray-700">{u.displayName}</div>
                                </div>
                                <div className="text-lg md:text-xl font-bold text-gray-800">{u.totalStars} <i className="fas fa-star text-yellow-400 ml-1"></i></div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ==========================================
// THE CORE GAME ENGINE WRAPPER (Natural Look & Perfect Mobile Touch)
// ==========================================
function GameEngine({ view, setView, levelData, mapId, levelId, saveProgress }) {
    const gameContainerRef = useRef(null);
    const [moves, setMoves] = useState(0);
    const [gameState, setGameState] = useState('playing'); 
    const [starsEarned, setStarsEarned] = useState(0);
    const [showTutorial, setShowTutorial] = useState(false);
    const [popupMessage, setPopupMessage] = useState(null); // State สำหรับ Custom Popup
    
    const isSandbox = view === 'sandbox';
    const [sbLhsHtml, setSbLhsHtml] = useState('<span class="editor-node editor-fraction" contenteditable="false"><span class="frac-num" contenteditable="true">x</span><div class="frac-line"></div><span class="frac-den" contenteditable="true">2</span></span>');
    const [sbRhsHtml, setSbRhsHtml] = useState('10');

    const engineRef = useRef({
        localGameState: { lhs: [], rhs: [] },
        historyStack: [], historyIndex: -1, internalMoveCount: 0, dragSrc: null, audioCtx: null
    });

    // 🎨 CSS ดีไซน์แบบดั้งเดิม (แบนเรียบ สะอาดตา) + Media Queries สำหรับมือถือ
    const engineCSS = `
        .term-container { display: inline-flex; align-items: center; margin: 0 2px; transition: all 0.2s; }
        .term-card { display: flex; flex-direction: column; align-items: center; justify-content: center; background: white; color: #4a5568; font-family: 'Fredoka', sans-serif; font-weight: 600; border-radius: 12px; cursor: grab; box-shadow: 0 2px 4px rgba(0,0,0,0.08); border: 2px solid #e2e8f0; position: relative; user-select: none; }
        .term-card.is-variable { background: #4FACFE; color: white; border-color: #00f2fe; }
        .term-card.is-number { background: linear-gradient(to top, #fbc2eb 0%, #a6c1ee 100%); color: white; border-color: #fff; }
        .term-card.is-operator { background: transparent; box-shadow: none; border: none; color: #718096; padding: 0 4px; min-width: auto; cursor: default; }
        .term-card.is-operator.interactive { cursor: pointer; }
        .term-card.is-operator.draggable-negative { cursor: grab; color: #e53e3e; font-weight: bold; }
        .term-card:active { transform: scale(0.95); }
        
        .fraction-group { display: inline-flex; flex-direction: column; align-items: center; background: rgba(255,255,255,0.7); border: 2px dashed #cbd5e0; cursor: grab; margin: 0 4px; }
        .fraction-line { width: 100%; background-color: #4a5568; margin: 4px 0; }
        .numerator-container, .denominator-container { display: flex; align-items: center; justify-content: center; padding: 2px; }
        
        .group-bracket { color: #94a3b8; font-weight: 300; line-height: 0.8; font-family: 'Kanit'; cursor: default; }
        .dragging-ghost { opacity: 0.9; position: fixed; z-index: 9999; pointer-events: none; transform: scale(1.05) rotate(2deg); box-shadow: 0 15px 25px -5px rgba(0, 0, 0, 0.15); }

        /* การจัดการขนาด (Responsive) ด้วย Media Queries ให้เหมือนดั้งเดิมและไม่ล้นจอ */
        @media (max-width: 768px) {
            .term-card { font-size: 1.2rem; padding: 6px 10px; min-width: 35px; border-radius: 10px; }
            .term-card.is-operator { font-size: 1.2rem; }
            .group-bracket { font-size: 2.2rem; transform: translateY(-2px); }
            .fraction-group { padding: 4px 6px; border-radius: 10px; }
            .fraction-line { height: 2px; }
            .numerator-container, .denominator-container { min-height: 25px; min-width: 30px; }
            .engine-equal { width: 40px; height: 40px; font-size: 1.5rem; }
        }
        @media (min-width: 769px) {
            .term-card { font-size: 1.8rem; padding: 10px 16px; min-width: 60px; border-radius: 16px; }
            .term-card.is-operator { font-size: 1.5rem; }
            .group-bracket { font-size: 3.5rem; transform: translateY(-4px); }
            .fraction-group { padding: 8px 12px; border-radius: 16px; }
            .fraction-line { height: 3px; }
            .numerator-container, .denominator-container { min-height: 45px; min-width: 60px; }
            .engine-equal { width: 60px; height: 60px; font-size: 2rem; }
        }
    `;

    const initEngine = (lhsHtmlSource, rhsHtmlSource) => {
        const eng = engineRef.current;
        eng.internalMoveCount = 0; setMoves(0); eng.historyStack = []; eng.historyIndex = -1;
        if(!eng.audioCtx) eng.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Parser
        const parseHTMLtoMath = (htmlString) => {
            const tempDiv = document.createElement('div'); tempDiv.innerHTML = htmlString;
            let eq = '';
            function traverse(node) {
                if (node.nodeType === Node.TEXT_NODE) eq += node.textContent;
                else if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.classList.contains('editor-fraction')) {
                        let num = node.querySelector('.frac-num')?.innerText.trim() || '1';
                        let den = node.querySelector('.frac-den')?.innerText.trim() || '1';
                        eq += `(${num})/(${den})`;
                    } else node.childNodes.forEach(child => traverse(child));
                }
            }
            traverse(tempDiv);
            let str = eq.replace(/\s+/g, '').replace(/x/g, 'x');
            let oldStr; do { oldStr = str; str = str.replace(/\(\(([^()]+)\)\)/g, '($1)'); } while (oldStr !== str);
            class Term { constructor(type, value, children = null, denominator = null) { this.id = Math.random().toString(36).substr(2, 9); this.type = type; this.value = value; this.children = children; this.denominator = denominator; } }
            function parseExpression(s) {
                let terms = [], buffer = '', depth = 0; s = s.replace(/\*/g, '•');
                for (let i = 0; i < s.length; i++) {
                    let char = s[i]; if (char === '(') depth++; if (char === ')') depth--;
                    if (depth === 0 && (char === '+' || char === '-')) { if (buffer === '') buffer += char; else { terms.push(...parseTermGroup(buffer)); terms.push(new Term('op', char)); buffer = ''; } } else buffer += char;
                }
                if (buffer) terms.push(...parseTermGroup(buffer)); return terms;
            }
            function parseTermGroup(s) {
                let parts = [], buffer = '', depth = 0;
                for(let i=0; i<s.length; i++) {
                    let char = s[i]; if (char === '(') depth++; if (char === ')') depth--;
                    if (depth === 0 && char === '•') { if(buffer) parts.push(parseSingleTerm(buffer)); parts.push(new Term('op', '•')); buffer = ''; } else buffer += char;
                }
                if(buffer) parts.push(parseSingleTerm(buffer)); return parts;
            }
            function parseSingleTerm(s) {
                if (s.startsWith('(') && s.endsWith(')')) {
                    let d = 0, match = true; for(let i=0; i<s.length-1; i++) { if(s[i] === '(') d++; if(s[i] === ')') d--; if(d === 0) { match = false; break; } }
                    if(match) { let inner = s.slice(1, -1), innerTerms = parseExpression(inner); if (innerTerms.length > 1) return new Term('group', null, innerTerms); else if (innerTerms.length === 1) return innerTerms[0]; }
                }
                let depth = 0, slashIdx = -1; for(let i=0; i<s.length; i++) { if(s[i] === '(') depth++; if(s[i] === ')') depth--; if(depth === 0 && s[i] === '/') { slashIdx = i; break; } }
                if (slashIdx !== -1) { return new Term('fraction', null, parseExpression(s.substring(0, slashIdx)), (parseExpression(s.substring(slashIdx + 1)).length===1 ? parseExpression(s.substring(slashIdx + 1))[0] : new Term('group',null,parseExpression(s.substring(slashIdx + 1))))); }
                return new Term('term', s);
            }
            return { terms: parseExpression(str), TermObj: Term };
        };

        const { terms: parsedLhs, TermObj } = parseHTMLtoMath(lhsHtmlSource);
        const { terms: parsedRhs } = parseHTMLtoMath(rhsHtmlSource);
        eng.localGameState.lhs = parsedLhs; eng.localGameState.rhs = parsedRhs; eng.TermClass = TermObj;

        // Utilities
        eng.gcd = (a, b) => b === 0 ? a : eng.gcd(b, a % b);
        eng.lcm = (a, b) => { if (a === 0 || b === 0) return 0; return Math.abs((a * b) / eng.gcd(a, b)); }
        eng.playTone = (type) => { /* Tone logic omitted for simplicity */ };
        
        // ใช้ Custom Popup แทน alert()
        eng.showPopup = (msg) => {
            setPopupMessage(msg);
            eng.playTone('error');
        };
        
        eng.shakeElement = (el) => { el.style.transform = 'translateX(5px)'; setTimeout(()=>el.style.transform='none', 200); }

        // Core Logic hooks
        eng.commitState = () => {
            for(let k=0; k<2; k++) { eng.simplifyList(eng.localGameState.lhs); eng.simplifyList(eng.localGameState.rhs); eng.unwrapGroups(eng.localGameState.lhs); eng.unwrapGroups(eng.localGameState.rhs); }
            eng.simplifyList(eng.localGameState.lhs); eng.simplifyList(eng.localGameState.rhs);
            eng.historyStack.push(JSON.parse(JSON.stringify(eng.localGameState))); eng.historyIndex++; eng.render(); eng.checkWinCondition();
        };
        eng.undo = () => { if (eng.historyIndex > 0) { eng.historyIndex--; eng.localGameState = JSON.parse(JSON.stringify(eng.historyStack[eng.historyIndex])); eng.render(); } };
        
        eng.unwrapGroups = (list) => {
            for (let i = 0; i < list.length; i++) {
                let term = list[i];
                if (term.type === 'group') {
                    let isMultiplying = (i > 0 && list[i-1].value === '•') || (i < list.length - 1 && list[i+1].value === '•');
                    eng.unwrapGroups(term.children);
                    if (term.children.length === 1 && term.children[0].type === 'group') { term.children = term.children[0].children; i--; continue; }
                    if (term.children.length === 1 && term.children[0].type === 'term') { list.splice(i, 1, term.children[0]); i--; continue; }
                    else if (term.children.length === 2 && term.children[0].type === 'op' && term.children[1].type === 'term') {
                        let op = term.children[0], val = term.children[1];
                        if (op.value === '+') list.splice(i, 1, val); else if (op.value === '-') { list.splice(i, 1, op, val); i++; }
                    }
                    if (!isMultiplying || (!isMultiplying && term.children.length === 1)) { list.splice(i, 1, ...term.children); i--; }
                } else if (term.type === 'fraction') {
                    if (term.children) eng.unwrapGroups(term.children);
                    if (term.denominator && term.denominator.type === 'group') { eng.unwrapGroups(term.denominator.children); if (term.denominator.children.length === 1 && term.denominator.children[0].type === 'term') term.denominator = term.denominator.children[0]; }
                }
            }
        };

        eng.simplifyList = (list) => {
            while (list.length > 0 && list[0].type === 'op' && list[0].value === '+') list.shift();
            for (let i = 0; i < list.length; i++) {
                let term = list[i];
                if (term.type === 'group') eng.simplifyList(term.children);
                if (term.type === 'fraction') { if (term.children) eng.simplifyList(term.children); if (term.denominator && term.denominator.type === 'group') eng.simplifyList(term.denominator.children); }
                if (i === 0 && term.type === 'op' && term.value === '+') { list.splice(i, 1); i--; continue; }
                if (term.type === 'op' && term.value === '-' && i < list.length - 1 && list[i+1].type === 'term' && list[i+1].value.startsWith('-')) { term.value = '+'; list[i+1].value = list[i+1].value.substring(1); }
                if (term.type === 'op' && i < list.length - 1 && list[i+1].type === 'op') { let n = list[i+1]; if (term.value === '-' && n.value === '-') { term.value = '+'; list.splice(i+1, 1); i--; } else if (term.value === '+' && n.value === '-') { term.value = '-'; list.splice(i+1, 1); i--; } else if (term.value === '-' && n.value === '+') { term.value = '-'; list.splice(i+1, 1); i--; } else if (term.value === '+' && n.value === '+') { term.value = '+'; list.splice(i+1, 1); i--; } }
                if (term.type === 'term') {
                    if (term.value && term.value.startsWith('+') && term.value.length > 1) term.value = term.value.substring(1);
                    if (term.value && term.value.startsWith('-') && term.value.length > 1) { if (i > 0 && list[i-1].type === 'op') { let op = list[i-1]; if (op.value === '+') { op.value = '-'; term.value = term.value.substring(1); } else if (op.value === '-') { op.value = '+'; term.value = term.value.substring(1); } } else if (i === 1 && list[0].type === 'op' && list[0].value === '-') { list.shift(); term.value = term.value.substring(1); i--; } }
                    if (term.value) { let m = term.value.match(/^(-?)1([a-zA-Z]+)$/); if (m) term.value = m[1] + m[2]; }
                }
                if (term.type === 'term' && term.value === '1') { if (i+1 < list.length && list[i+1].value === '•') { list.splice(i, 2); i--; continue; } if (i > 0 && list[i-1].value === '•') { list.splice(i-1, 2); i-=2; continue; } }
                if (term.type === 'fraction') { let denVal = term.denominator.type === 'term' ? term.denominator.value : (term.denominator.type === 'group' && term.denominator.children.length === 1 && term.denominator.children[0].type === 'term' ? term.denominator.children[0].value : null); if (denVal === '1') { let content = term.children; let newTerm = (content.length === 1 && content[0].type !== 'op') ? content[0] : new eng.TermClass('group', null, content); list.splice(i, 1, newTerm); i--; continue; } }
            }
        };

        // Render & Double Tap Fix
        eng.render = () => {
            const lhsZone = document.getElementById('engine-lhs'), rhsZone = document.getElementById('engine-rhs');
            if(lhsZone) { lhsZone.innerHTML = ''; eng.localGameState.lhs.forEach((t, i) => lhsZone.appendChild(eng.createTermElement(t, 'lhs', eng.localGameState.lhs, i, 0))); }
            if(rhsZone) { rhsZone.innerHTML = ''; eng.localGameState.rhs.forEach((t, i) => rhsZone.appendChild(eng.createTermElement(t, 'rhs', eng.localGameState.rhs, i, 0))); }
        };

        // ฟังก์ชันจับการแตะเบิ้ลสำหรับมือถือ (Double Tap Fix)
        const makeDoubleTap = (el, action) => {
            let tapCount = 0;
            let tapTimer = null;
            el.ondblclick = (e) => {
                e.stopPropagation();
                action();
            };
            el.ontouchend = (e) => {
                // ห้าม e.stopPropagation() เด็ดขาด เพื่อให้เหตุการณ์ปล่อยนิ้วทะลุไปถึงระบบวาง (Drop)
                
                // ถ้านิ้วมีการขยับลาก (Drag) ให้ถือว่าไม่ใช่การแตะเบิ้ล
                if (eng.dragSrc && eng.dragSrc.hasMoved) {
                    tapCount = 0;
                    return;
                }

                tapCount++;
                if (tapCount === 1) {
                    tapTimer = setTimeout(() => { tapCount = 0; }, 300);
                } else if (tapCount === 2) {
                    clearTimeout(tapTimer);
                    tapCount = 0;
                    if(e.cancelable) e.preventDefault();
                    action();
                }
            };
        };

        eng.createTermElement = (term, side, list, idx, depth) => {
            let wrapper = document.createElement('div'); wrapper.className = 'term-container'; wrapper.dataset.idx = idx; wrapper.dataset.side = side;
            if (term.type === 'op') {
                let card = document.createElement('div'); card.className = 'term-card is-operator'; card.innerText = term.value;
                if (term.value === '•') { 
                    makeDoubleTap(card, () => { eng.combineSplitTerm(term, list, idx); eng.commitState(); });
                } 
                else if (term.value === '-' && idx < list.length - 1 && (list[idx+1].type === 'group' || list[idx+1].type === 'fraction')) { card.classList.add('draggable-negative'); eng.setupDrag(card, term, side, list, idx, 'distribute-negative'); }
                wrapper.appendChild(card);
            } else if (term.type === 'group') {
                let br = (depth % 3 === 0) ? ['(', ')'] : (depth % 3 === 1) ? ['[', ']'] : ['{', '}'];
                let lB = document.createElement('div'); lB.innerText = br[0]; lB.className = 'group-bracket';
                let rB = document.createElement('div'); rB.innerText = br[1]; rB.className = 'group-bracket';
                wrapper.appendChild(lB); term.children.forEach((c, i) => wrapper.appendChild(eng.createTermElement(c, side, list, i, depth + 1))); wrapper.appendChild(rB);
                eng.setupDrag(wrapper, term, side, list, idx, 'group'); wrapper.dataset.idx = idx; wrapper.dataset.side = side;
            } else if (term.type === 'fraction') {
                let fracGroup = document.createElement('div'); fracGroup.className = 'fraction-group';
                let numCont = document.createElement('div'); numCont.className = 'numerator-container'; numCont.dataset.parentFracId = term.id;
                term.children.forEach((c, i) => numCont.appendChild(eng.createChildTermElement(c, term.children, i, term.id, 'numerator', side, null, null, null, depth)));
                let line = document.createElement('div'); line.className = 'fraction-line';
                let denCont = document.createElement('div'); denCont.className = 'denominator-container'; denCont.dataset.parentFracId = term.id;
                if (term.denominator.type === 'group') term.denominator.children.forEach((c, i) => denCont.appendChild(eng.createChildTermElement(c, term.denominator.children, i, term.id, 'denominator', side, term, list, idx, depth)));
                else denCont.appendChild(eng.createChildTermElement(term.denominator, null, -1, term.id, 'denominator', side, term, list, idx, depth));
                fracGroup.append(numCont, line, denCont); 
                makeDoubleTap(fracGroup, () => { eng.splitFraction(term, list, idx); });
                eng.setupDrag(fracGroup, term, side, list, idx, 'whole-fraction'); wrapper.appendChild(fracGroup); wrapper.dataset.idx = idx; wrapper.dataset.side = side;
            } else {
                let card = document.createElement('div'); card.className = term.value.match(/[a-zA-Z]/) ? 'term-card is-variable' : 'term-card is-number'; card.innerText = term.value;
                makeDoubleTap(card, () => { eng.splitTerm(term, list, idx); });
                eng.setupDrag(card, term, side, list, idx, 'term'); wrapper.appendChild(card); wrapper.dataset.idx = idx; wrapper.dataset.side = side;
            }
            return wrapper;
        };

        eng.createChildTermElement = (child, list, childIdx, parentId, context, side, parentFracTerm, mainList, mainIdx, depth) => {
            let el;
            if (child.type === 'group') {
                el = document.createElement('div'); el.className = 'term-container inline-flex items-center mx-1'; 
                let br = (depth % 3 === 0) ? ['(', ')'] : (depth % 3 === 1) ? ['[', ']'] : ['{', '}']; let lB = document.createElement('div'); lB.innerText = br[0]; lB.className = 'group-bracket'; let rB = document.createElement('div'); rB.innerText = br[1]; rB.className = 'group-bracket';
                el.appendChild(lB); child.children.forEach((gc, i) => el.appendChild(eng.createChildTermElement(gc, child.children, i, parentId, context, side, parentFracTerm, mainList, mainIdx, depth + 1))); el.appendChild(rB);
                if(list) eng.setupDrag(el, child, null, list, childIdx, 'inner-term', parentFracTerm, mainList, mainIdx, context);
            } else {
                el = child.type === 'op' ? document.createElement('span') : document.createElement('div');
                if (parentId) el.dataset.parentFracId = parentId; 
                if(child.type === 'op') { 
                    el.className = 'term-card is-operator mx-1'; el.innerText = child.value;
                    if(child.value === '•' && list) { 
                        makeDoubleTap(el, () => { eng.combineSplitTerm(child, list, childIdx); eng.commitState(); });
                    }
                    else if (child.value === '-' && list && childIdx < list.length - 1 && list[childIdx+1].type === 'group') { el.classList.add('draggable-negative'); eng.setupDrag(el, child, side, list, childIdx, 'distribute-negative', parentFracTerm, mainList, mainIdx, context); }
                } else {
                    el.className = (child.value.match(/[a-zA-Z]/) ? 'term-card is-variable' : 'term-card is-number') + ' px-1 py-1 min-w-[20px] ' + context + '-term'; el.innerText = child.value; el.dataset.parentFracId = parentId; 
                    if(list) el.dataset.childIdx = childIdx;
                    if (context === 'denominator' && !list) { el.dataset.childIdx = 0; eng.setupDrag(el, parentFracTerm, null, mainList, mainIdx, 'denominator', null, null, null, context); } 
                    else if(list) { 
                        makeDoubleTap(el, () => { eng.splitTerm(child, list, childIdx); });
                        eng.setupDrag(el, child, null, list, childIdx, 'inner-term', parentFracTerm, mainList, mainIdx, context); 
                    }
                }
            }
            if (el && list) el.dataset.side = side;
            return el;
        };

        eng.setupDrag = (el, term, side, list, idx, role, parentFracTerm = null, mainList = null, mainIdx = null, sourceContext = null) => {
            const handleStart = (clientX, clientY, eOriginal) => {
                eOriginal.stopPropagation(); 
                // ป้องกันหน้าจอเลื่อน (Scroll) ตอนจิ้มลาก แต่ยังยอมให้ระบบ Tap ทำงานได้
                if (eOriginal.type !== 'touchstart' && eOriginal.cancelable) {
                    eOriginal.preventDefault();
                }

                eng.internalMoveCount++; setMoves(eng.internalMoveCount);
                
                // เคลียร์ Ghost อันเก่า (ถ้ามีค้างอยู่) ก่อนสร้างอันใหม่
                if (eng.dragSrc && eng.dragSrc.ghost) {
                    eng.dragSrc.ghost.remove();
                }

                // เพิ่ม hasMoved: false เพื่อคอยเช็คว่าลากจริงหรือไม่
                eng.dragSrc = { el, term, side, list, idx, role, parentFracTerm, mainList, mainIdx, sourceContext, hasMoved: false };
                let ghost = el.cloneNode(true); ghost.classList.add('dragging-ghost'); ghost.style.width = el.offsetWidth + 'px'; 
                document.body.appendChild(ghost); eng.dragSrc.ghost = ghost;
                
                const moveGhost = (x, y) => { 
                    if(eng.dragSrc && eng.dragSrc.ghost) {
                        eng.dragSrc.ghost.style.left = (x - eng.dragSrc.ghost.offsetWidth/2) + 'px'; 
                        eng.dragSrc.ghost.style.top = (y - eng.dragSrc.ghost.offsetHeight/2) + 'px'; 
                    }
                };
                moveGhost(clientX, clientY);
                
                const onMove = (ev) => { 
                    let cx = ev.clientX ?? ev.touches?.[0]?.clientX; 
                    let cy = ev.clientY ?? ev.touches?.[0]?.clientY; 
                    if(cx && cy) {
                        if (eng.dragSrc) eng.dragSrc.hasMoved = true; // ยืนยันว่ามีการลากนิ้วแล้ว
                        moveGhost(cx, cy); 
                        if (ev.cancelable) ev.preventDefault(); // ป้องกันจอมือถือเลื่อนตามนิ้วขณะกำลังลาก
                    }
                };
                const onEnd = (ev) => {
                    document.removeEventListener('mousemove', onMove); document.removeEventListener('touchmove', onMove);
                    document.removeEventListener('mouseup', onEnd); document.removeEventListener('touchend', onEnd);
                    document.removeEventListener('touchcancel', onEnd);

                    if (!eng.dragSrc) return;
                    let endX = ev.clientX ?? ev.changedTouches?.[0]?.clientX; let endY = ev.clientY ?? ev.changedTouches?.[0]?.clientY;
                    
                    // บังคับลบ Ghost ทันทีที่ยกนิ้ว
                    if (eng.dragSrc.ghost) {
                        eng.dragSrc.ghost.remove();
                    }

                    let pg = document.getElementById('engine-playground');
                    // เช็ค hasMoved ป้องกันกรณีแค่แตะ (Tap) ไม่ได้ตั้งใจลาก
                    if(pg && endX && endY && eng.dragSrc.hasMoved) {
                        let rect = pg.getBoundingClientRect(), midX = rect.left + rect.width/2;
                        let isGlobalMove = (role === 'term' || role === 'denominator' || role === 'whole-fraction');
                        let currentSide = eng.dragSrc.side || (eng.dragSrc.list === eng.localGameState.lhs ? 'lhs' : (eng.dragSrc.list === eng.localGameState.rhs ? 'rhs' : null));
                        let crossRight = currentSide === 'lhs' && endX > midX + 30, crossLeft = currentSide === 'rhs' && endX < midX - 30;
                        
                        if (isGlobalMove && (crossRight || crossLeft)) {
                            eng.dragSrc.side = currentSide; eng.executeMoveSide();
                        } else {
                            // หา element ที่อยู่ข้างใต้จุดที่ยกนิ้ว (ลบโกสต์ไปแล้ว ทำให้หาเจอง่ายขึ้น)
                            let elemBelow = document.elementFromPoint(endX, endY); 
                            
                            if (role === 'distribute-negative') {
                                let cItem = eng.dragSrc.el.closest('.term-container'); let nItem = cItem ? cItem.nextElementSibling : null;
                                if (nItem && (nItem === elemBelow || nItem.contains(elemBelow))) { eng.distributeNegative(eng.dragSrc.term, eng.dragSrc.list, eng.dragSrc.idx); }
                            } else {
                                let targetWrapper = elemBelow ? elemBelow.closest('.term-container') : null;
                                if (targetWrapper && targetWrapper !== eng.dragSrc.el.closest('.term-container')) eng.tryCombine(targetWrapper, elemBelow); 
                            }
                        }
                    }
                    
                    // ใช้ setTimeout หน่วงนิดเดียว เพื่อให้ฟังก์ชันแตะเบิ้ลตรวจสอบ hasMoved ได้ทันก่อนถูกทำลาย
                    setTimeout(() => {
                        if (eng.dragSrc && eng.dragSrc.ghost) {
                            eng.dragSrc.ghost.remove();
                        }
                        eng.dragSrc = null;
                    }, 0);
                };

                document.addEventListener('mousemove', onMove, {passive: false}); document.addEventListener('touchmove', onMove, {passive: false});
                document.addEventListener('mouseup', onEnd); document.addEventListener('touchend', onEnd);
                document.addEventListener('touchcancel', onEnd);
            };
            el.onmousedown = (e) => { if(e.button === 0) handleStart(e.clientX, e.clientY, e); };
            el.ontouchstart = (e) => { if(e.touches.length === 1) handleStart(e.touches[0].clientX, e.touches[0].clientY, e); };
        };

        // Execution Logistics
        eng.executeMoveSide = () => {
            let { term, side, list, idx, role, parentFracTerm, mainList, mainIdx, sourceContext } = eng.dragSrc;
            if (role === 'inner-term' && parentFracTerm && list.length === 1) { term = parentFracTerm; list = mainList; idx = mainIdx; role = 'denominator'; }
            if (!list) return; let targetList = side === 'lhs' ? eng.localGameState.rhs : eng.localGameState.lhs;
            
            if (role === 'denominator') {
                if (list.some((t, i) => i > 0 && t.type === 'op' && (t.value === '+' || t.value === '-'))) return eng.showPopup("รวมเศษส่วนก่อนย้ายตัวหารครับ");
                list.splice(idx, 1, new eng.TermClass('group', null, JSON.parse(JSON.stringify(term.children))));
                if (targetList.length > 1) { let inner = JSON.parse(JSON.stringify(targetList)); targetList.length = 0; targetList.push(new eng.TermClass('group', null, inner)); }
                let val = term.denominator.value || "1";
                if(term.denominator.type === 'group' && term.denominator.children.length === 1) targetList.push(new eng.TermClass('op', '•'), term.denominator.children[0]);
                else if (term.denominator.type === 'group') targetList.push(new eng.TermClass('op', '•'), new eng.TermClass('group', null, term.denominator.children));
                else targetList.push(new eng.TermClass('op', '•'), new eng.TermClass('term', val));
            } else {
                let isFactor = false, removeIdx = idx, removeCount = 1, nextTerm = (idx < list.length - 1) ? list[idx+1] : null, prevTerm = (idx > 0) ? list[idx-1] : null;
                if (nextTerm && nextTerm.value === '•') { isFactor = true; removeCount = 2; } else if (prevTerm && prevTerm.value === '•') { isFactor = true; removeIdx = idx - 1; removeCount = 2; }
                if (isFactor || sourceContext === 'denominator') {
                    if (list.some((t, i) => i > 0 && t.type === 'op' && (t.value === '+' || t.value === '-'))) return eng.showPopup("กำจัดบวกลบก่อนย้ายตัวคูณครับ");
                    let moveValue = term.value;
                    if(idx === 1 && list[0].type === 'op' && (list[0].value === '-' || list[0].value === '+')) { if(list[0].value === '-') moveValue = '-' + moveValue; removeIdx = 0; removeCount += 1; }
                    list.splice(removeIdx, removeCount);
                    if (sourceContext === 'denominator') {
                        if (targetList.length > 1) { let inner = JSON.parse(JSON.stringify(targetList)); targetList.length = 0; targetList.push(new eng.TermClass('group', null, inner)); }
                        targetList.push(new eng.TermClass('op', '•'), new eng.TermClass('term', moveValue));
                    } else {
                        let num = JSON.parse(JSON.stringify(targetList)); targetList.length = 0; targetList.push(new eng.TermClass('fraction', null, num, new eng.TermClass('term', moveValue)));
                    }
                } else {
                    let movingSign = '+'; if (idx > 0 && list[idx-1].type === 'op') { movingSign = list[idx-1].value; removeIdx = idx - 1; removeCount = 2; }
                    list.splice(removeIdx, removeCount); if(list.length > 0 && list[0].type === 'op' && (list[0].value === '+' || list[0].value === '•')) list.shift();
                    let newSign = movingSign === '+' ? '-' : '+';
                    if (targetList.length > 0) targetList.push(new eng.TermClass('op', newSign)); else if (newSign === '-') targetList.push(new eng.TermClass('op', '-'));
                    targetList.push(term);
                }
            }
            eng.commitState();
        };

        eng.tryCombine = (targetWrapper) => {
            let list = eng.dragSrc.list, targetIdx = parseInt(targetWrapper.dataset.idx);
            if (isNaN(targetIdx) || targetIdx === eng.dragSrc.idx) return;
            let min = Math.min(eng.dragSrc.idx, targetIdx), max = Math.max(eng.dragSrc.idx, targetIdx);
            
            if (max - min === 2) {
                let op = list[min+1];
                if (op && (op.value === '+' || op.value === '-')) {
                    if ((min > 0 && list[min-1].value === '•') || (max < list.length-1 && list[max+1].value === '•')) return eng.showPopup("ติดตัวคูณอยู่ครับ");
                    let parseVar = (v) => { if(typeof v!=='string') return null; let m=v.match(/^(-?\d*)([a-zA-Z]+)$/); if(m) return {c: m[1]===''?1:(m[1]==='-'?-1:parseInt(m[1])), v: m[2]}; if(!isNaN(v)) return {c: parseInt(v), v: null}; return null; };
                    let p1 = parseVar(list[min].value), p2 = parseVar(list[max].value);
                    if (p1 && p2 && p1.v === p2.v) {
                        let s1 = (min > 0 && list[min-1].value === '-') ? -1 : 1, s2 = op.value === '-' ? -1 : 1;
                        let res = (p1.c * s1) + (p2.c * s2);
                        list.splice(min, 3, new eng.TermClass('term', res + (p1.v || '')));
                        eng.commitState(); return;
                    }
                } else if (op && op.value === '•') {
                     let p1 = parseInt(list[min].value), p2 = parseInt(list[max].value);
                     if(!isNaN(p1) && !isNaN(p2)) { list.splice(min, 3, new eng.TermClass('term', (p1*p2).toString())); eng.commitState(); return; }
                }
            }
        };

        eng.splitFraction = (term, list, idx) => { let nt = []; term.children.forEach(t => nt.push(t)); list.splice(idx, 1, ...nt); eng.commitState(); };
        eng.splitTerm = (term, list, idx) => { let m = term.value.match(/^(-?\d+)([a-zA-Z]+)$/); if(m) { list.splice(idx, 1, new eng.TermClass('term', m[1]), new eng.TermClass('op', '•'), new eng.TermClass('term', m[2])); eng.commitState(); }};
        eng.combineSplitTerm = (term, list, idx) => { if(idx>0 && idx<list.length-1) { list.splice(idx-1, 3, new eng.TermClass('term', list[idx-1].value + list[idx+1].value)); eng.commitState(); } };
        eng.distributeNegative = (term, list, idx) => { if(idx >= list.length-1) return; let t = list[idx+1]; if(t.type==='group') { list[idx].value='+'; list.splice(idx+1, 1, ...t.children); eng.commitState(); } };

        eng.checkWinCondition = () => {
            const isSolved = (list) => list.length === 1 && list[0].type === 'term' && (list[0].value === 'x' || list[0].value === '1x');
            const isNum = (list) => list.length === 1 && list[0].type === 'term' && !isNaN(list[0].value);
            if ((isSolved(eng.localGameState.lhs) && isNum(eng.localGameState.rhs)) || (isSolved(eng.localGameState.rhs) && isNum(eng.localGameState.lhs))) {
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#4ade80', '#3b82f6', '#fbbf24'] });
                setGameState('won');
                if (!isSandbox) {
                    let calcStars = (eng.internalMoveCount <= levelData?.parMoves) ? 5 : (eng.internalMoveCount === levelData?.parMoves+1 ? 4 : (eng.internalMoveCount === levelData?.parMoves+2 ? 3 : (eng.internalMoveCount === levelData?.parMoves+3 ? 2 : 1)));
                    setStarsEarned(calcStars); saveProgress(mapId, levelId, calcStars);
                }
            }
        };

        eng.commitState();
    };

    useEffect(() => {
        if (!isSandbox && levelData) { initEngine(levelData.lhsHtml || levelData.lhs, levelData.rhsHtml || levelData.rhs); } 
        else if (isSandbox) { initEngine(sbLhsHtml, sbRhsHtml); }
        return () => { if(engineRef.current.audioCtx) engineRef.current.audioCtx.suspend(); };
    }, [levelData, isSandbox]);

    const handleSandboxStart = () => { initEngine(sbLhsHtml, sbRhsHtml); setGameState('playing'); };

    return (
        <div className="flex flex-col h-screen p-2 md:p-6" ref={gameContainerRef}>
            <style>{engineCSS}</style>
            
            {/* Header / Top Bar */}
            <div className="flex justify-between items-center mb-2 md:mb-4 bg-white/80 backdrop-blur-md p-2 md:p-4 rounded-full shadow-sm border border-gray-100 relative z-20">
                <button onClick={() => setView(isSandbox ? 'menu' : 'levelSelect')} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 md:px-5 py-1.5 md:py-2 rounded-full font-bold text-xs md:text-sm transition-colors flex items-center">
                    <i className="fas fa-arrow-left mr-1 md:mr-2"></i> กลับ
                </button>
                
                <div className="text-sm md:text-xl font-bold text-gray-800 truncate px-2">
                    {isSandbox ? 'โหมดฝึกฝนสร้างโจทย์' : `Map ${mapId} - Level ${levelId}`}
                </div>
                
                <div className="flex items-center gap-1 md:gap-3">
                    <button onClick={() => setShowTutorial(true)} className="bg-yellow-50 text-yellow-600 px-2 py-1.5 md:px-4 md:py-2 rounded-full font-bold text-xs md:text-sm border border-yellow-200 hover:bg-yellow-100 transition-colors">
                        <i className="fas fa-question-circle"></i><span className="hidden md:inline ml-1.5">วิธีเล่น</span>
                    </button>
                    <div className="bg-blue-50 text-blue-700 px-3 md:px-4 py-1.5 md:py-2 rounded-full font-bold text-xs md:text-sm border border-blue-200 whitespace-nowrap">
                        ย้าย: <span className="text-sm md:text-lg text-blue-600 ml-1">{moves}</span> 
                        {!isSandbox && <span className="hidden md:inline ml-1 text-gray-500 font-normal">/{levelData?.parMoves}</span>}
                    </div>
                    <button onClick={() => { setGameState('playing'); isSandbox ? handleSandboxStart() : initEngine(levelData.lhsHtml, levelData.rhsHtml); }} className="bg-red-50 text-red-600 border border-red-200 px-2 py-1.5 md:px-4 md:py-2 rounded-full font-bold text-xs md:text-sm hover:bg-red-100 transition-colors">
                        <i className="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>

            {/* Sandbox Input - Flex Row Responsive */}
            {isSandbox && (
                <div className="bg-white/95 backdrop-blur-md p-3 md:p-5 rounded-[2rem] shadow-md border border-gray-100 mb-2 md:mb-4 flex flex-col gap-3 shrink-0 mx-auto max-w-5xl w-full">
                    <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-center w-full justify-center">
                        <div className="w-full md:w-5/12"><VisualEditor id="sbLhs" label="ฝั่งซ้าย (LHS)" value={sbLhsHtml} onChange={setSbLhsHtml} /></div>
                        <div className="text-3xl md:text-4xl font-black text-gray-300 mt-2 md:mt-6">=</div>
                        <div className="w-full md:w-5/12"><VisualEditor id="sbRhs" label="ฝั่งขวา (RHS)" value={sbRhsHtml} onChange={setSbRhsHtml} /></div>
                    </div>
                    <button onClick={handleSandboxStart} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 px-6 rounded-full text-sm md:text-base self-center transition-colors">
                        <i className="fas fa-play mr-2"></i> เล่นสมการนี้
                    </button>
                </div>
            )}

            {/* Engine Area */}
            <div className="flex-1 flex flex-col relative bg-white/50 backdrop-blur-md rounded-[2rem] md:rounded-[3rem] p-2 md:p-4 border border-white min-h-[40vh]">
                <div id="engine-playground" className="bg-white rounded-2xl md:rounded-[2.5rem] border-2 md:border-[6px] border-white/80 shadow-sm flex items-center justify-center p-2 md:p-8 relative w-full h-full flex-1 overflow-x-auto">
                    <div className="w-[2px] bg-gray-200/80 h-[80%] rounded-full absolute left-1/2 transform -translate-x-1/2 z-0"></div>
                    <div id="engine-lhs" className="flex-1 h-full flex items-center justify-end pr-2 md:pr-10 gap-1 md:gap-2 z-10 w-1/2 overflow-visible"></div>
                    <div className="engine-equal bg-red-400 text-white rounded-full flex items-center justify-center font-black z-20 border-2 border-white flex-shrink-0">=</div>
                    <div id="engine-rhs" className="flex-1 h-full flex items-center justify-start pl-2 md:pl-10 gap-1 md:gap-2 z-10 w-1/2 overflow-visible"></div>
                </div>

                <div className="absolute bottom-2 md:bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-2 md:gap-4 bg-white/95 px-4 md:px-6 py-2 md:py-2.5 rounded-full shadow-md z-30 whitespace-nowrap border border-gray-100">
                    <button onClick={() => engineRef.current.undo()} className="text-gray-500 hover:text-blue-600 text-base md:text-xl bg-gray-50 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border border-gray-200 transition-colors"><i className="fas fa-undo"></i></button>
                    <div className="text-gray-500 font-semibold border-l-2 pl-2 md:pl-4 text-xs md:text-sm border-gray-200">
                        <i className="fas fa-hand-pointer text-blue-400 mr-1.5"></i>ลากวาง <span className="hidden md:inline">| แตะเบิ้ล 2 ครั้งเพื่อแยก</span>
                    </div>
                </div>
            </div>

            {/* Win Overlay: Custom for Sandbox vs Campaign */}
            {gameState === 'won' && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-[100]">
                    <div className="bg-white p-6 md:p-12 rounded-[2rem] shadow-xl border-4 border-green-400 text-center max-w-lg w-11/12">
                        <h2 className="text-3xl md:text-5xl font-black text-green-500 mb-2 md:mb-4">ยอดเยี่ยม!</h2>
                        <p className="text-gray-600 text-sm md:text-lg mb-6">คุณแก้สมการสำเร็จแล้ว</p>
                        
                        {!isSandbox && (
                            <div className="flex gap-2 justify-center mb-6 md:mb-8">
                                {[1,2,3,4,5].map(star => <i key={star} className={`fas fa-star text-4xl md:text-5xl ${star <= starsEarned ? 'text-yellow-400 drop-shadow-sm' : 'text-gray-200'}`}></i>)}
                            </div>
                        )}
                        
                        <div className="flex gap-3 justify-center">
                            {isSandbox ? (
                                <button onClick={() => setGameState('playing')} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 md:py-3 px-6 md:px-10 rounded-full text-sm md:text-lg transition-colors shadow-sm">
                                    ปิดหน้าต่างนี้
                                </button>
                            ) : (
                                <>
                                    <button onClick={() => setView('levelSelect')} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 md:py-3 px-4 md:px-6 rounded-full text-sm md:text-lg transition-colors">กลับเมนู</button>
                                    {levelId < 10 && <button onClick={() => { setView('levelSelect'); setTimeout(()=>setView('play'), 100); }} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 md:py-3 px-4 md:px-6 rounded-full text-sm md:text-lg transition-colors shadow-sm">ด่านต่อไป</button>}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Popup Overlay */}
            {popupMessage && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[300] p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-6 md:p-8 max-w-sm w-full shadow-2xl text-center transform scale-100 animate-in zoom-in-95 duration-200 border-2 border-red-100">
                        <div className="text-5xl text-red-500 mb-4 drop-shadow-sm"><i className="fas fa-exclamation-circle"></i></div>
                        <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">ทำไม่ได้ครับ!</h3>
                        <p className="text-base md:text-lg text-gray-600 mb-6">{popupMessage}</p>
                        <button 
                            onClick={() => setPopupMessage(null)} 
                            className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-10 rounded-full text-lg transition-transform active:scale-95 shadow-md"
                        >
                            ตกลง
                        </button>
                    </div>
                </div>
            )}

            {showTutorial && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={() => setShowTutorial(false)}>
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl md:text-2xl font-extrabold text-blue-600 mb-4 border-b pb-3"><i className="fas fa-book-open mr-2"></i>วิธีเล่นพื้นฐาน</h2>
                        <ul className="space-y-3 text-sm md:text-base text-gray-700">
                            <li className="bg-gray-50 p-3 rounded-xl border border-gray-100"><strong className="text-blue-500">1. ย้ายข้าง:</strong> แตะค้างที่ตัวเลขแล้วลากข้ามฝั่ง = (บวกจะกลายเป็นลบ อัตโนมัติ)</li>
                            <li className="bg-gray-50 p-3 rounded-xl border border-gray-100"><strong className="text-green-500">2. รวมพจน์:</strong> ลากตัวเลขที่เหมือนกันไปซ้อนทับกันเพื่อบวก/ลบ/คูณ/หาร</li>
                            <li className="bg-gray-50 p-3 rounded-xl border border-gray-100"><strong className="text-purple-500">3. แยกร่าง / รวมร่าง:</strong> แตะเบิ้ล 2 ครั้งไวๆ (Double Tap) ที่ตัวแปร (เช่น 3x) เพื่อแยกตัวเลข หรือแตะ 2 ครั้งที่จุดคูณ (•) เพื่อรวมกลับ</li>
                        </ul>
                        <button onClick={() => setShowTutorial(false)} className="mt-5 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 rounded-full text-base transition-colors">เข้าใจแล้ว</button>
                    </div>
                </div>
            )}
        </div>
    );
}
