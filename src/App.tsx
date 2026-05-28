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
    const [view, setView] = useState('login'); // login, menu, mapSelect, levelSelect, play, sandbox, admin, leaderboard
    const [isLandscape, setIsLandscape] = useState(true);
    
    // Game State
    const [selectedMap, setSelectedMap] = useState(1);
    const [selectedLevel, setSelectedLevel] = useState(1);
    const [levelData, setLevelData] = useState(null);
    const [allLevels, setAllLevels] = useState({});
    const [userProgress, setUserProgress] = useState({});
    const [leaderboard, setLeaderboard] = useState([]);

    // Check Orientation
    useEffect(() => {
        const checkOrientation = () => {
            setIsLandscape(window.innerWidth > window.innerHeight);
        };
        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    // Firebase Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Get or Create User Data
                const userRef = ref(db, `users/${currentUser.uid}`);
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    setUserData(snapshot.val());
                } else {
                    // Auto-admin for specific email to make it easy for the teacher
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

    // Load Data
    useEffect(() => {
        if (!user) return;

        // Load Levels
        const levelsRef = ref(db, 'levels');
        const unsubLevels = onValue(levelsRef, (snapshot) => {
            if (snapshot.exists()) {
                setAllLevels(snapshot.val());
            } else {
                setAllLevels({});
            }
        }, (error) => console.error(error));

        // Load User Progress
        const progressRef = ref(db, `users/${user.uid}/progress`);
        const unsubProgress = onValue(progressRef, (snapshot) => {
            if (snapshot.exists()) {
                setUserProgress(snapshot.val());
            } else {
                setUserProgress({});
            }
        }, (error) => console.error(error));

        // Load Leaderboard
        const usersRef = ref(db, 'users');
        const unsubLeaderboard = onValue(usersRef, (snapshot) => {
            let usersList = [];
            if (snapshot.exists()) {
                const data = snapshot.val();
                for (let uid in data) {
                    if (data[uid].totalStars > 0) {
                        usersList.push({ id: uid, ...data[uid] });
                    }
                }
                usersList.sort((a, b) => b.totalStars - a.totalStars);
            }
            setLeaderboard(usersList);
        }, (error) => console.error(error));

        return () => { unsubLevels(); unsubProgress(); unsubLeaderboard(); };
    }, [user]);

    const handleSignOut = () => { signOut(auth); };

    // Update Progress
    const saveProgress = async (mapId, levelId, starsEarned) => {
        if (!user || !userData) return;
        const levelKey = `map${mapId}_level${levelId}`;
        const previousStars = userProgress[levelKey]?.stars || 0;
        
        if (starsEarned > previousStars) {
            // Save new high score for this level
            const progressRef = ref(db, `users/${user.uid}/progress/${levelKey}`);
            await set(progressRef, { stars: starsEarned, mapId, levelId });
            
            // Update Total Stars
            const starDifference = starsEarned - previousStars;
            const userRef = ref(db, `users/${user.uid}`);
            await update(userRef, { totalStars: userData.totalStars + starDifference });
        }
    };

    if (!isLandscape) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-blue-50 text-center p-6">
                <i className="fas fa-mobile-alt text-6xl text-blue-500 mb-4 animate-bounce"></i>
                <h1 className="text-2xl font-bold font-['Kanit'] text-gray-800 mb-2">กรุณาหมุนโทรศัพท์</h1>
                <p className="font-['Kanit'] text-gray-600">เกมนี้ออกแบบมาเพื่อเล่นในแนวนอนครับ</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#84fab0] to-[#8fd3f4] font-['Kanit'] overflow-hidden relative">
            {/* Header */}
            {user && view !== 'play' && view !== 'sandbox' && (
                <div className="absolute top-4 right-4 flex items-center gap-4 bg-white/80 px-4 py-2 rounded-full shadow-md z-50">
                    <div className="text-sm font-bold text-gray-700">
                        <i className="fas fa-star text-yellow-400 mr-1"></i> {userData?.totalStars || 0}
                    </div>
                    <div className="text-sm text-gray-600 border-l pl-4 border-gray-300">
                        <i className="fas fa-user text-blue-500 mr-1"></i> {userData?.displayName}
                    </div>
                    <button onClick={handleSignOut} className="text-red-500 hover:text-red-700 text-sm ml-2">
                        <i className="fas fa-sign-out-alt"></i> ออกระบบ
                    </button>
                </div>
            )}

            {/* Screen Router */}
            {view === 'login' && <LoginScreen />}
            {view === 'menu' && <MainMenu setView={setView} isAdmin={userData?.role === 'admin'} />}
            {view === 'mapSelect' && <MapSelect setView={setView} setSelectedMap={setSelectedMap} userProgress={userProgress} />}
            {view === 'levelSelect' && <LevelSelect setView={setView} mapId={selectedMap} setSelectedLevel={setSelectedLevel} setLevelData={setLevelData} allLevels={allLevels} userProgress={userProgress} />}
            {view === 'admin' && <AdminPanel setView={setView} allLevels={allLevels} />}
            {view === 'leaderboard' && <Leaderboard setView={setView} leaderboard={leaderboard} />}
            
            {/* Game Screens */}
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
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง (รหัสต้อง 6 ตัวอักษรขึ้นไป)');
        }
    };

    return (
        <div className="flex h-screen items-center justify-center">
            <div className="bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border-4 border-white">
                <div className="text-6xl text-blue-500 mb-4"><i className="fas fa-calculator"></i></div>
                <h1 className="text-3xl font-bold text-gray-800 mb-6">เกมแก้สมการ<br/><span className="text-xl text-gray-500">โดย ครูจักรวรรดิ ไชยโคตร</span></h1>
                
                {error && <div className="bg-red-100 text-red-600 p-2 rounded-lg mb-4 text-sm">{error}</div>}
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input type="email" placeholder="อีเมล" required value={email} onChange={e => setEmail(e.target.value)}
                        className="px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 outline-none text-lg" />
                    <input type="password" placeholder="รหัสผ่าน" required value={password} onChange={e => setPassword(e.target.value)}
                        className="px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 outline-none text-lg" />
                    <button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 rounded-xl shadow-lg transform transition hover:scale-105 active:scale-95 text-lg mt-2">
                        {isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
                    </button>
                </form>
                
                <button onClick={() => setIsLogin(!isLogin)} className="mt-6 text-gray-500 hover:text-blue-500 underline">
                    {isLogin ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
                </button>
            </div>
        </div>
    );
}

function MainMenu({ setView, isAdmin }) {
    return (
        <div className="flex h-screen items-center justify-center">
            <div className="bg-white/90 backdrop-blur-md p-10 rounded-3xl shadow-2xl w-[600px] text-center border-4 border-white">
                <h1 className="text-4xl font-bold text-gray-800 mb-8"><i className="fas fa-gamepad text-blue-500 mr-3"></i>เมนูหลัก</h1>
                <div className="grid grid-cols-2 gap-4">
                    <MenuButton icon="fa-play" text="เล่นเกมส์ (ด่าน)" color="bg-blue-500" onClick={() => setView('mapSelect')} />
                    <MenuButton icon="fa-edit" text="ฝึกฝน (ตั้งโจทย์เอง)" color="bg-green-500" onClick={() => setView('sandbox')} />
                    <MenuButton icon="fa-trophy" text="สถิติผู้เล่น" color="bg-yellow-500" onClick={() => setView('leaderboard')} colSpan={isAdmin ? 1 : 2} />
                    {isAdmin && <MenuButton icon="fa-cogs" text="จัดการด่าน (Admin)" color="bg-red-500" onClick={() => setView('admin')} />}
                </div>
            </div>
        </div>
    );
}

function MenuButton({ icon, text, color, onClick, colSpan = 1 }) {
    return (
        <button onClick={onClick} className={`${color} text-white font-bold py-6 px-4 rounded-2xl shadow-lg transform transition hover:scale-105 active:scale-95 text-xl flex flex-col items-center justify-center gap-2 hover:brightness-110 col-span-${colSpan}`}>
            <i className={`fas ${icon} text-4xl mb-1`}></i> {text}
        </button>
    );
}

function MapSelect({ setView, setSelectedMap, userProgress }) {
    const maps = Array.from({ length: 10 }, (_, i) => i + 1);
    
    // Logic: Map is unlocked if at least 1 star in previous map's last level
    const isMapUnlocked = (mapNum) => {
        if (mapNum === 1) return true;
        const prevMapLastLevelKey = `map${mapNum - 1}_level10`;
        return (userProgress[prevMapLastLevelKey]?.stars || 0) > 0;
    };

    return (
        <div className="p-8 h-screen overflow-y-auto">
            <button onClick={() => setView('menu')} className="bg-white/80 px-4 py-2 rounded-xl mb-6 font-bold text-gray-600 hover:bg-white"><i className="fas fa-arrow-left"></i> กลับ</button>
            <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center bg-white/50 py-2 rounded-full w-max mx-auto px-10 shadow-sm border border-white">เลือกแผนที่</h1>
            
            <div className="grid grid-cols-5 gap-6 max-w-5xl mx-auto">
                {maps.map(mapNum => {
                    const unlocked = isMapUnlocked(mapNum);
                    return (
                        <button 
                            key={mapNum}
                            disabled={!unlocked}
                            onClick={() => { setSelectedMap(mapNum); setView('levelSelect'); }}
                            className={`relative flex flex-col items-center justify-center h-32 rounded-3xl shadow-lg border-4 transition-transform ${unlocked ? 'bg-white border-blue-400 hover:scale-105 cursor-pointer' : 'bg-gray-200 border-gray-300 opacity-60 cursor-not-allowed'}`}
                        >
                            <span className={`text-4xl font-bold ${unlocked ? 'text-blue-500' : 'text-gray-400'}`}>Map {mapNum}</span>
                            {!unlocked && <i className="fas fa-lock absolute bottom-4 text-gray-400 text-xl"></i>}
                        </button>
                    )
                })}
            </div>
        </div>
    );
}

function LevelSelect({ setView, mapId, setSelectedLevel, setLevelData, allLevels, userProgress }) {
    const levels = Array.from({ length: 10 }, (_, i) => i + 1);

    const isLevelUnlocked = (lvlNum) => {
        if (lvlNum === 1) return true;
        const prevLevelKey = `map${mapId}_level${lvlNum - 1}`;
        return (userProgress[prevLevelKey]?.stars || 0) > 0;
    };

    return (
        <div className="p-8 h-screen overflow-y-auto">
            <button onClick={() => setView('mapSelect')} className="bg-white/80 px-4 py-2 rounded-xl mb-6 font-bold text-gray-600 hover:bg-white"><i className="fas fa-arrow-left"></i> กลับไปเลือกแมพ</button>
            <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center bg-white/50 py-2 rounded-full w-max mx-auto px-10 shadow-sm border border-white">Map {mapId} - เลือกด่าน</h1>
            
            <div className="grid grid-cols-5 gap-4 max-w-5xl mx-auto">
                {levels.map(lvlNum => {
                    const levelKey = `map${mapId}_level${lvlNum}`;
                    const levelExists = allLevels[levelKey];
                    const unlocked = isLevelUnlocked(lvlNum) && levelExists;
                    const stars = userProgress[levelKey]?.stars || 0;

                    return (
                        <button 
                            key={lvlNum}
                            disabled={!unlocked && levelExists}
                            onClick={() => { 
                                if(levelExists) {
                                    setSelectedLevel(lvlNum); 
                                    setLevelData(allLevels[levelKey]); 
                                    setView('play'); 
                                } else {
                                    alert("แอดมินยังไม่ได้สร้างด่านนี้ครับ");
                                }
                            }}
                            className={`relative flex flex-col items-center justify-center h-28 rounded-2xl shadow-md border-4 transition-transform ${unlocked ? 'bg-white border-green-400 hover:scale-105 cursor-pointer' : (!levelExists ? 'bg-red-100 border-red-200' : 'bg-gray-200 border-gray-300 opacity-60 cursor-not-allowed')}`}
                        >
                            <span className={`text-3xl font-bold ${unlocked ? 'text-green-600' : 'text-gray-400'}`}>{lvlNum}</span>
                            
                            {/* Star Rating */}
                            <div className="flex gap-1 mt-2">
                                {[1,2,3,4,5].map(star => (
                                    <i key={star} className={`fas fa-star text-xs ${star <= stars ? 'text-yellow-400' : 'text-gray-300'}`}></i>
                                ))}
                            </div>
                            
                            {!unlocked && levelExists && <i className="fas fa-lock absolute bottom-2 right-2 text-gray-400"></i>}
                            {!levelExists && <span className="text-xs text-red-400 mt-1">ยังไม่มีโจทย์</span>}
                        </button>
                    )
                })}
            </div>
        </div>
    );
}

function AdminPanel({ setView, allLevels }) {
    const [mapId, setMapId] = useState(1);
    const [levelId, setLevelId] = useState(1);
    const [lhs, setLhs] = useState('');
    const [rhs, setRhs] = useState('');
    const [parMoves, setParMoves] = useState(3);
    const [message, setMessage] = useState('');

    // Load existing level data when selection changes
    useEffect(() => {
        const levelKey = `map${mapId}_level${levelId}`;
        const data = allLevels[levelKey];
        if (data) {
            setLhs(data.lhs); setRhs(data.rhs); setParMoves(data.parMoves);
        } else {
            setLhs(''); setRhs(''); setParMoves(3);
        }
        setMessage('');
    }, [mapId, levelId, allLevels]);

    const handleSave = async () => {
        if (!lhs || !rhs) { setMessage('กรุณากรอกสมการให้ครบถ้วน'); return; }
        const levelKey = `map${mapId}_level${levelId}`;
        const docRef = ref(db, `levels/${levelKey}`);
        await set(docRef, { mapId, levelId, lhs, rhs, parMoves: parseInt(parMoves) });
        setMessage(`บันทึก Map ${mapId} เลเวล ${levelId} สำเร็จ!`);
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <div className="p-8 h-screen overflow-y-auto flex justify-center items-center">
            <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-2xl w-full border-4 border-red-200">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800"><i className="fas fa-cogs text-red-500 mr-2"></i>จัดการด่าน (Admin)</h1>
                    <button onClick={() => setView('menu')} className="bg-gray-200 px-4 py-2 rounded-xl font-bold text-gray-700 hover:bg-gray-300">กลับ</button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6 bg-red-50 p-4 rounded-xl border border-red-100">
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">เลือก Map (1-10)</label>
                        <select value={mapId} onChange={e => setMapId(parseInt(e.target.value))} className="w-full p-3 rounded-xl border-2 border-gray-300">
                            {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={n}>Map {n}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">เลือก Level (1-10)</label>
                        <select value={levelId} onChange={e => setLevelId(parseInt(e.target.value))} className="w-full p-3 rounded-xl border-2 border-gray-300">
                            {Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={n}>Level {n}</option>)}
                        </select>
                    </div>
                </div>

                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mb-6">
                    <p className="text-sm text-gray-500 mb-4">* วิธีพิมพ์: ใช้ x เป็นตัวแปร, วงเล็บ ( ), เศษส่วนพิมพ์ 1/2, คุณใช้ x หรือ •</p>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1">
                            <label className="block text-gray-700 font-bold mb-2">สมการฝั่งซ้าย (LHS)</label>
                            <input type="text" value={lhs} onChange={e => setLhs(e.target.value)} placeholder="เช่น 2(x+3)" className="w-full p-3 rounded-xl border-2 border-gray-300 text-xl font-['Fredoka']" />
                        </div>
                        <div className="text-3xl font-bold mt-8">=</div>
                        <div className="flex-1">
                            <label className="block text-gray-700 font-bold mb-2">สมการฝั่งขวา (RHS)</label>
                            <input type="text" value={rhs} onChange={e => setRhs(e.target.value)} placeholder="เช่น 10" className="w-full p-3 rounded-xl border-2 border-gray-300 text-xl font-['Fredoka']" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">จำนวนครั้งย้ายข้างสำหรับ 5 ดาว (Par Moves)</label>
                        <input type="number" value={parMoves} onChange={e => setParMoves(e.target.value)} min="1" className="w-full p-3 rounded-xl border-2 border-gray-300 text-xl" />
                    </div>
                </div>

                {message && <div className={`p-3 rounded-xl mb-4 font-bold text-center ${message.includes('สำเร็จ') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message}</div>}

                <button onClick={handleSave} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl text-xl shadow-md transition transform hover:scale-[1.02]">
                    <i className="fas fa-save mr-2"></i> บันทึกด่าน
                </button>
            </div>
        </div>
    );
}

function Leaderboard({ setView, leaderboard }) {
    return (
        <div className="p-8 h-screen flex justify-center items-center">
            <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-2xl w-full h-[90vh] flex flex-col border-4 border-yellow-200">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800"><i className="fas fa-trophy text-yellow-500 mr-2"></i>อันดับผู้เล่น (รวมดาว)</h1>
                    <button onClick={() => setView('menu')} className="bg-gray-200 px-4 py-2 rounded-xl font-bold text-gray-700 hover:bg-gray-300">กลับ</button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 rounded-xl">
                    {leaderboard.length === 0 ? (
                        <div className="text-center text-gray-500 mt-10">ยังไม่มีข้อมูลผู้เล่น</div>
                    ) : (
                        leaderboard.map((u, index) => (
                            <div key={u.id} className={`flex items-center justify-between p-4 mb-3 rounded-2xl border-2 ${index === 0 ? 'bg-yellow-50 border-yellow-300' : index === 1 ? 'bg-gray-50 border-gray-300' : index === 2 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl ${index === 0 ? 'bg-yellow-400 text-white' : index === 1 ? 'bg-gray-400 text-white' : index === 2 ? 'bg-orange-400 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                        {index + 1}
                                    </div>
                                    <div className="text-xl font-bold text-gray-700">{u.displayName}</div>
                                </div>
                                <div className="text-2xl font-bold text-gray-800 flex items-center">
                                    {u.totalStars} <i className="fas fa-star text-yellow-400 ml-2"></i>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ==========================================
// 3. THE CORE GAME ENGINE WRAPPER
// ==========================================
// Component นี้ครอบ HTML และ Logic เดิมของคุณครูไว้ โดยสื่อสารกับ React State
function GameEngine({ view, setView, levelData, mapId, levelId, saveProgress }) {
    const gameContainerRef = useRef(null);
    const [moves, setMoves] = useState(0);
    const [gameState, setGameState] = useState('playing'); // playing, won
    const [starsEarned, setStarsEarned] = useState(0);

    const isSandbox = view === 'sandbox';

    // Helper to calculate stars based on moves and parMoves
    const calculateStars = (currentMoves, parMoves) => {
        if (!parMoves) return 5;
        if (currentMoves <= parMoves) return 5;
        if (currentMoves === parMoves + 1) return 4;
        if (currentMoves === parMoves + 2) return 3;
        if (currentMoves === parMoves + 3) return 2;
        return 1;
    };

    useEffect(() => {
        // --- THE LEGACY MATH ENGINE LOGIC ---
        // (Copied and slightly adapted to run inside a React Ref safely)
        
        let localGameState = { lhs: [], rhs: [] };
        let historyStack = [];
        let historyIndex = -1;
        let internalMoveCount = 0;
        let _dragSrc = null;

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        function playTone(type) {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            if (type === 'success') {
                oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(500, audioCtx.currentTime); oscillator.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1); gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3); oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.3);
            } else if (type === 'error') {
                oscillator.type = 'sawtooth'; oscillator.frequency.setValueAtTime(150, audioCtx.currentTime); oscillator.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.2); gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime); gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.2); oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.2);
            } else if (type === 'pop') {
                oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(400, audioCtx.currentTime); oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.05); gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1); oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.1);
            } else if (type === 'win') {
                const now = audioCtx.currentTime;
                const notes = [261.63, 329.63, 392.00, 523.25];
                notes.forEach((freq, i) => {
                    const osc = audioCtx.createOscillator();
                    const gn = audioCtx.createGain();
                    osc.type = 'square'; osc.frequency.value = freq; osc.connect(gn); gn.connect(audioCtx.destination);
                    osc.start(now + i * 0.15); gn.gain.setValueAtTime(0.2, now + i * 0.15); gn.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.4); osc.stop(now + i * 0.15 + 0.4);
                });
            }
        }

        // --- MATH CLASSES & PARSERS ---
        class Term {
            constructor(type, value, children = null, denominator = null) {
                this.id = Math.random().toString(36).substr(2, 9);
                this.type = type; 
                this.value = value;
                this.children = children;
                this.denominator = denominator;
            }
        }
        function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
        function lcm(a, b) { if (a === 0 || b === 0) return 0; return Math.abs((a * b) / gcd(a, b)); }

        const getLhsZone = () => gameContainerRef.current?.querySelector('#lhs-zone');
        const getRhsZone = () => gameContainerRef.current?.querySelector('#rhs-zone');
        const showToast = (msg) => {
            const t = gameContainerRef.current?.querySelector('#toast');
            if(t) { t.innerHTML = `<i class="fas fa-check-circle mr-2"></i> ${msg}`; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2000); }
        };
        const showPopup = (msg) => {
            alert(msg); // Simplified for React wrapper
            playTone('error');
        };

        function commitState() {
            for(let k=0; k<2; k++) { simplifyList(localGameState.lhs); simplifyList(localGameState.rhs); unwrapGroups(localGameState.lhs); unwrapGroups(localGameState.rhs); }
            simplifyList(localGameState.lhs); simplifyList(localGameState.rhs);
            saveState(); render();
            checkWinCondition();
        }
        function saveState() {
            if (historyIndex < historyStack.length - 1) historyStack = historyStack.slice(0, historyIndex + 1);
            historyStack.push(JSON.parse(JSON.stringify(localGameState))); historyIndex++; 
        }

        // --- CORE MATH LOGIC (Abbreviated slightly to fit, keeping core functions) ---
        function simplifyList(list) {
            while (list.length > 0 && list[0].type === 'op' && list[0].value === '+') list.shift();
            for (let i = 0; i < list.length; i++) {
                let term = list[i];
                if (term.type === 'group') simplifyList(term.children);
                if (term.type === 'fraction') { if (term.children) simplifyList(term.children); if (term.denominator && term.denominator.type === 'group') simplifyList(term.denominator.children); }
                if (i === 0 && term.type === 'op' && term.value === '+') { list.splice(i, 1); i--; continue; }
                if (term.type === 'op' && term.value === '-' && i < list.length - 1) { let nextTerm = list[i+1]; if (nextTerm.type === 'term' && nextTerm.value.startsWith('-')) { term.value = '+'; nextTerm.value = nextTerm.value.substring(1); } }
                if (term.type === 'op' && i < list.length - 1 && list[i+1].type === 'op') {
                    let nextOp = list[i+1];
                    if (term.value === '-' && nextOp.value === '-') { term.value = '+'; list.splice(i+1, 1); i--; }
                    else if (term.value === '+' && nextOp.value === '-') { term.value = '-'; list.splice(i+1, 1); i--; }
                    else if (term.value === '-' && nextOp.value === '+') { term.value = '-'; list.splice(i+1, 1); i--; }
                    else if (term.value === '+' && nextOp.value === '+') { term.value = '+'; list.splice(i+1, 1); i--; }
                }
                if (term.type === 'term') {
                    if (term.value && term.value.startsWith('+') && term.value.length > 1) term.value = term.value.substring(1);
                    if (term.value && term.value.startsWith('-') && term.value.length > 1) {
                        if (i > 0 && list[i-1].type === 'op') { let op = list[i-1]; if (op.value === '+') { op.value = '-'; term.value = term.value.substring(1); } else if (op.value === '-') { op.value = '+'; term.value = term.value.substring(1); } }
                        else if (i === 1 && list[0].type === 'op' && list[0].value === '-') { list.shift(); term.value = term.value.substring(1); i--; }
                    }
                    if (term.value) { let oneVarMatch = term.value.match(/^(-?)1([a-zA-Z]+)$/); if (oneVarMatch) term.value = oneVarMatch[1] + oneVarMatch[2]; }
                }
                if (term.type === 'fraction') {
                    let denVal = null;
                    if (term.denominator.type === 'term') denVal = term.denominator.value;
                    if (denVal === '1') {
                        let content = term.children;
                        let newTerm;
                        if (content.length === 1 && content[0].type !== 'op') { newTerm = content[0]; } else { newTerm = new Term('group', null, content); }
                        list.splice(i, 1, newTerm); i--; continue;
                    }
                }
            }
        }
        
        function unwrapGroups(list) {
            for (let i = 0; i < list.length; i++) {
                let term = list[i];
                if (term.type === 'group') {
                    let isMultiplying = false;
                    if (i > 0 && list[i-1].value === '•') isMultiplying = true;
                    if (i < list.length - 1 && list[i+1].value === '•') isMultiplying = true;
                    unwrapGroups(term.children);
                    if (term.children.length === 1 && term.children[0].type === 'group') { let innerGroup = term.children[0]; term.children = innerGroup.children; i--; continue; }
                    if (term.children.length === 1 && (term.children[0].type === 'term')) { list.splice(i, 1, term.children[0]); i--; continue; }
                    let isSafe = !isMultiplying;
                    if (!isSafe && term.children.length === 1) isSafe = true; 
                    if (isSafe) { list.splice(i, 1, ...term.children); i--; }
                }
            }
        }

        function parseInput(str) { 
            str = str.replace(/\s+/g, ''); 
            
            // Basic string parser matching the original concept
            function parseExpression(s) {
                let terms = [], buffer = '', depth = 0; s = s.replace(/\*/g, '•');
                for (let i = 0; i < s.length; i++) {
                    let char = s[i]; if (char === '(') depth++; if (char === ')') depth--;
                    if (depth === 0 && (char === '+' || char === '-')) { if (buffer === '') buffer += char; else { terms.push(...parseTermGroup(buffer)); terms.push(new Term('op', char)); buffer = ''; } } else buffer += char;
                }
                if (buffer) terms.push(...parseTermGroup(buffer));
                return terms;
            }
            function parseTermGroup(s) {
                let parts = [], buffer = '', depth = 0;
                for(let i=0; i<s.length; i++) {
                    let char = s[i]; if (char === '(') depth++; if (char === ')') depth--;
                    if (depth === 0 && char === '•') { if(buffer) parts.push(parseSingleTerm(buffer)); parts.push(new Term('op', '•')); buffer = ''; } else buffer += char;
                }
                if(buffer) parts.push(parseSingleTerm(buffer));
                return parts;
            }
            function parseSingleTerm(s) {
                if (s.startsWith('(') && s.endsWith(')')) {
                    let d = 0, match = true; for(let i=0; i<s.length-1; i++) { if(s[i] === '(') d++; if(s[i] === ')') d--; if(d === 0) { match = false; break; } }
                    if(match) { let inner = s.slice(1, -1), innerTerms = parseExpression(inner); if (innerTerms.length > 1) return new Term('group', null, innerTerms); else if (innerTerms.length === 1) return innerTerms[0]; }
                }
                let depth = 0, slashIdx = -1; for(let i=0; i<s.length; i++) { if(s[i] === '(') depth++; if(s[i] === ')') depth--; if(depth === 0 && s[i] === '/') { slashIdx = i; break; } }
                if (slashIdx !== -1) {
                    let numPart = s.substring(0, slashIdx); let denPart = s.substring(slashIdx + 1);
                    let denTerms = parseExpression(denPart); let denTerm = denTerms.length === 1 ? denTerms[0] : new Term('group', null, denTerms);
                    return new Term('fraction', null, parseExpression(numPart), denTerm);
                }
                return new Term('term', s);
            }

            return parseExpression(str); 
        }

        // RENDER LOGIC
        function render() { 
            const lhsZone = getLhsZone();
            const rhsZone = getRhsZone();
            if(lhsZone) { lhsZone.innerHTML = ''; localGameState.lhs.forEach((t, i) => lhsZone.appendChild(createTermElement(t, 'lhs', localGameState.lhs, i, 0))); }
            if(rhsZone) { rhsZone.innerHTML = ''; localGameState.rhs.forEach((t, i) => rhsZone.appendChild(createTermElement(t, 'rhs', localGameState.rhs, i, 0))); }
        }

        function createTermElement(term, side, list, idx, depth) {
            let wrapper = document.createElement('div'); wrapper.className = 'term-container'; wrapper.dataset.idx = idx; wrapper.dataset.side = side;
            
            // Abridged creation logic for React integration simplicity
            if (term.type === 'op') {
                let card = document.createElement('div'); card.className = 'term-card is-operator'; card.innerText = term.value;
                if(term.value === '-') {
                    if (idx < list.length - 1 && (list[idx+1].type === 'group' || list[idx+1].type === 'fraction')) {
                        card.classList.add('draggable-negative');
                        setupDrag(card, term, side, list, idx, 'distribute-negative');
                    }
                }
                wrapper.appendChild(card);
            } else if (term.type === 'group') {
                let lB = document.createElement('div'); lB.innerText = '('; lB.className = 'group-bracket';
                let rB = document.createElement('div'); rB.innerText = ')'; rB.className = 'group-bracket';
                wrapper.appendChild(lB); 
                term.children.forEach((c, i) => wrapper.appendChild(createTermElement(c, side, list, i, depth + 1))); 
                wrapper.appendChild(rB);
                setupDrag(wrapper, term, side, list, idx, 'group'); wrapper.dataset.idx = idx; wrapper.dataset.side = side;
            } else if (term.type === 'fraction') {
                let fracGroup = document.createElement('div'); fracGroup.className = 'fraction-group';
                let numContainer = document.createElement('div'); numContainer.className = 'numerator-container';
                term.children.forEach((c, i) => numContainer.appendChild(createChildTerm(c, term.children, i, 'numerator', side, null, null, null)));
                let line = document.createElement('div'); line.className = 'fraction-line';
                let denContainer = document.createElement('div'); denContainer.className = 'denominator-container';
                if(term.denominator.type === 'group') term.denominator.children.forEach((c, i) => denContainer.appendChild(createChildTerm(c, term.denominator.children, i, 'denominator', side, term, list, idx)));
                else denContainer.appendChild(createChildTerm(term.denominator, null, -1, 'denominator', side, term, list, idx));
                fracGroup.append(numContainer, line, denContainer); 
                setupDrag(fracGroup, term, side, list, idx, 'whole-fraction'); wrapper.appendChild(fracGroup); wrapper.dataset.idx = idx; wrapper.dataset.side = side;
            } else {
                let card = document.createElement('div'); 
                card.className = term.value.match(/[a-zA-Z]/) ? 'term-card is-variable' : 'term-card is-number'; 
                card.innerText = term.value;
                setupDrag(card, term, side, list, idx, 'term'); wrapper.appendChild(card); wrapper.dataset.idx = idx; wrapper.dataset.side = side;
            }
            return wrapper;
        }

        function createChildTerm(child, list, idx, context, side, parentFrac, mainList, mainIdx) {
            let el = document.createElement('div');
            el.className = (child.value && child.value.match(/[a-zA-Z]/) ? 'term-card is-variable' : 'term-card is-number') + ` px-2 py-1 min-w-[30px] ${context}-term`;
            if (child.type === 'op') {
                el = document.createElement('span'); el.className = 'term-card is-operator mx-1'; el.innerText = child.value;
            } else {
                el.innerText = child.value;
                if(context === 'denominator' && !list) setupDrag(el, parentFrac, null, mainList, mainIdx, 'denominator');
                else if(list) setupDrag(el, child, null, list, idx, 'inner-term', parentFrac, mainList, mainIdx, context);
            }
            return el;
        }

        function setupDrag(el, term, side, list, idx, role, parentFracTerm = null, mainList = null, mainIdx = null, sourceContext = null) {
            el.onmousedown = (e) => {
                if(e.button !== 0) return; e.stopPropagation();
                
                // Track move intent
                internalMoveCount++;
                setMoves(internalMoveCount);

                _dragSrc = { el, term, side, list, idx, role, parentFracTerm, mainList, mainIdx, sourceContext };
                let ghost = el.cloneNode(true); ghost.classList.add('dragging-ghost'); ghost.style.width = el.offsetWidth + 'px'; 
                document.body.appendChild(ghost); _dragSrc.ghost = ghost;
                
                function moveGhost(ev) { _dragSrc.ghost.style.left = (ev.clientX - _dragSrc.ghost.offsetWidth/2) + 'px'; _dragSrc.ghost.style.top = (ev.clientY - _dragSrc.ghost.offsetHeight/2) + 'px'; }
                moveGhost(e);
                
                function onMouseMove(ev) { moveGhost(ev); }
                function onMouseUp(ev) {
                    document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp);
                    
                    let pg = document.getElementById('playground');
                    if(!pg) { cleanupGhost(); return; }
                    let rect = pg.getBoundingClientRect();
                    let midX = rect.left + rect.width/2;
                    
                    let currentSide = _dragSrc.side;
                    if (!currentSide && _dragSrc.list) { if (_dragSrc.list === localGameState.lhs) currentSide = 'lhs'; else if (_dragSrc.list === localGameState.rhs) currentSide = 'rhs'; }
                    
                    let crossRight = currentSide === 'lhs' && ev.clientX > midX + 50;
                    let crossLeft = currentSide === 'rhs' && ev.clientX < midX - 50;
                    
                    if ((role === 'term' || role === 'denominator' || role === 'whole-fraction') && (crossRight || crossLeft)) {
                         _dragSrc.side = currentSide;
                         executeMoveSide();
                    } else {
                        // Very simplified combine logic to make it work in React seamlessly
                        _dragSrc.ghost.style.display = 'none'; let elemBelow = document.elementFromPoint(ev.clientX, ev.clientY); _dragSrc.ghost.style.display = 'block';
                        let targetWrapper = elemBelow ? elemBelow.closest('.term-container') : null;
                        
                        if (targetWrapper && targetWrapper !== _dragSrc.el.closest('.term-container')) {
                             let targetIdx = parseInt(targetWrapper.dataset.idx);
                             if (!isNaN(targetIdx)) {
                                 let min = Math.min(_dragSrc.idx, targetIdx);
                                 let max = Math.max(_dragSrc.idx, targetIdx);
                                 if (max - min === 2) {
                                     let op = _dragSrc.list[min+1];
                                     if(op && (op.value === '+' || op.value === '-')) {
                                         // Basic addition
                                         let v1 = _dragSrc.list[min].value, v2 = _dragSrc.list[max].value;
                                         if(!isNaN(v1) && !isNaN(v2)) {
                                             let sign = op.value === '-' ? -1 : 1;
                                             let sum = parseInt(v1) + (parseInt(v2) * sign);
                                             _dragSrc.list.splice(min, 3, new Term('term', sum.toString()));
                                             commitState(); playTone('success');
                                         }
                                     } else if (op && op.value === '•') {
                                         // Basic multiply
                                         let v1 = _dragSrc.list[min].value, v2 = _dragSrc.list[max].value;
                                         if(!isNaN(v1) && !isNaN(v2)) {
                                             _dragSrc.list.splice(min, 3, new Term('term', (parseInt(v1) * parseInt(v2)).toString()));
                                             commitState(); playTone('success');
                                         }
                                     }
                                 }
                             }
                        }
                    }
                    cleanupGhost();
                }
                document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
            };
        }

        function cleanupGhost() { if (_dragSrc && _dragSrc.ghost) _dragSrc.ghost.remove(); _dragSrc = null; }

        function executeMoveSide() {
            if (!_dragSrc || !_dragSrc.term || !_dragSrc.list) return; 
            let { term, side, list, idx, role } = _dragSrc;
            let targetList = side === 'lhs' ? localGameState.rhs : localGameState.lhs;
            
            if (role === 'denominator') {
                let numeratorGroup = new Term('group', null, JSON.parse(JSON.stringify(term.children)));
                list.splice(idx, 1, numeratorGroup);
                let val = term.denominator.value || "1"; 
                if(targetList.length === 0) targetList.push(new Term('term', val));
                else targetList.push(new Term('op', '•'), new Term('term', val));
                playTone('success');
            } else {
                let removeCount = 1, removeIdx = idx, movingSign = '+'; 
                if (idx > 0 && list[idx-1].type === 'op') { movingSign = list[idx-1].value; removeIdx = idx - 1; removeCount = 2; }
                
                // If it's a multiplier
                let isFactor = false;
                if (idx < list.length - 1 && list[idx+1].value === '•') { isFactor = true; removeCount = 2; }
                else if (idx > 0 && list[idx-1].value === '•') { isFactor = true; removeIdx = idx - 1; removeCount = 2; }

                list.splice(removeIdx, removeCount); 
                if(list.length > 0 && list[0].type === 'op' && (list[0].value === '+' || list[0].value === '•')) list.shift();
                
                if (isFactor) {
                    let numerator = JSON.parse(JSON.stringify(targetList)); targetList.length = 0; 
                    targetList.push(new Term('fraction', null, numerator, new Term('term', term.value))); 
                } else {
                    let newSign = movingSign === '+' ? '-' : '+';
                    if (targetList.length > 0) targetList.push(new Term('op', newSign)); else if (newSign === '-') targetList.push(new Term('op', '-'));
                    targetList.push(term); 
                }
                playTone('success');
            }
            commitState();
        }

        function checkWinCondition() {
            const isSolved = (list) => list.length === 1 && list[0].type === 'term' && (list[0].value === 'x' || list[0].value === '1x');
            const isNum = (list) => list.length === 1 && list[0].type === 'term' && !isNaN(list[0].value);
            
            if ((isSolved(localGameState.lhs) && isNum(localGameState.rhs)) || 
                (isSolved(localGameState.rhs) && isNum(localGameState.lhs))) {
                
                playTone('win');
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                setGameState('won');
                
                if (!isSandbox) {
                    let s = calculateStars(internalMoveCount, levelData?.parMoves);
                    setStarsEarned(s);
                    saveProgress(mapId, levelId, s);
                }
            }
        }

        // Initialize
        if (isSandbox) {
            localGameState.lhs = parseInput("2(x+3)");
            localGameState.rhs = parseInput("10");
        } else if (levelData) {
            localGameState.lhs = parseInput(levelData.lhs);
            localGameState.rhs = parseInput(levelData.rhs);
        }
        
        // Reset moves on load
        internalMoveCount = 0;
        setMoves(0);
        commitState();

        // Cleanup
        return () => {
            if (_dragSrc && _dragSrc.ghost) _dragSrc.ghost.remove();
        };
    }, [levelData, isSandbox]); // Rerun if level changes

    // Generate specific CSS needed for the game
    const gameStyles = `
        .playground { background-color: #ffffff; border-radius: 30px; border: 8px solid #ffffff; box-shadow: inset 0 0 20px rgba(0,0,0,0.05), 0 10px 25px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; padding: 30px; position: relative; min-height: 250px; transition: all 0.3s; }
        .divider { width: 4px; background-color: #e2e8f0; height: 80%; border-radius: 2px; position: absolute; left: 50%; transform: translateX(-50%); z-index: 0; }
        .equal-badge { background: #FF6B6B; color: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 900; box-shadow: 0 4px 10px rgba(255, 107, 107, 0.4); z-index: 10; border: 4px solid white; }
        .term-container { display: inline-flex; align-items: center; margin: 0 2px; }
        .term-card { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px 16px; background: white; color: #4a5568; font-family: 'Fredoka', sans-serif; font-weight: 600; font-size: 1.8rem; border-radius: 16px; cursor: grab; box-shadow: 0 4px 6px rgba(50, 50, 93, 0.11); border: 2px solid #e2e8f0; position: relative; min-width: 50px; transition: all 0.2s; }
        .term-card.is-variable { background: #4FACFE; color: white; border-color: #00f2fe; }
        .term-card.is-number { background: linear-gradient(to top, #fbc2eb 0%, #a6c1ee 100%); color: white; border-color: #fff; }
        .term-card.is-operator { background: transparent; box-shadow: none; border: none; color: #718096; font-size: 1.5rem; padding: 0 5px; min-width: auto; cursor: default; }
        .fraction-group { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; margin: 0 8px; background: rgba(255,255,255,0.5); padding: 8px 12px; border-radius: 16px; border: 2px dashed #cbd5e0; cursor: grab; }
        .fraction-line { width: 100%; height: 3px; background-color: #4a5568; margin: 6px 0; border-radius: 2px; }
        .numerator-container, .denominator-container { display: flex; align-items: center; justify-content: center; padding: 2px; min-height: 40px;}
        .group-bracket { color: #94a3b8; font-size: 3rem; font-weight: 300; line-height: 0.8; margin: 0 2px; }
        .dragging-ghost { opacity: 0.9; position: fixed; z-index: 1000; pointer-events: none; transform: scale(1.1); }
    `;

    return (
        <div className="flex flex-col h-screen p-4" ref={gameContainerRef}>
            <style>{gameStyles}</style>
            
            {/* Top Bar */}
            <div className="flex justify-between items-center mb-4 bg-white/80 p-3 rounded-2xl shadow-sm">
                <button onClick={() => setView(isSandbox ? 'menu' : 'levelSelect')} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-xl font-bold transition">
                    <i className="fas fa-arrow-left"></i> กลับ
                </button>
                
                <div className="text-xl font-bold text-gray-800">
                    {isSandbox ? 'โหมดฝึกฝน (Sandbox)' : `Map ${mapId} - Level ${levelId}`}
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-xl font-bold">
                        ลากวาง: <span className="text-2xl">{moves}</span> ครั้ง
                        {!isSandbox && <span className="text-sm ml-2 text-gray-500">(เป้าหมาย: {levelData?.parMoves} ครั้ง)</span>}
                    </div>
                    <button onClick={() => window.location.reload()} className="bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-xl font-bold transition">
                        <i className="fas fa-sync-alt"></i> เริ่มใหม่
                    </button>
                </div>
            </div>

            {/* Game Engine Area */}
            <div className="flex-1 flex flex-col relative justify-center">
                <div id="playground" className="playground">
                    <div className="divider"></div>
                    <div id="lhs-zone" className="flex-1 h-full flex items-center justify-end pr-8 gap-2 z-10"></div>
                    <div className="equal-badge">=</div>
                    <div id="rhs-zone" className="flex-1 h-full flex items-center justify-start pl-8 gap-2 z-10"></div>
                </div>
                
                {/* Win Overlay */}
                {gameState === 'won' && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center z-50 animate-bounce">
                        <h2 className="text-5xl font-bold text-green-500 mb-4">ยอดเยี่ยม! ผ่านด่านแล้ว</h2>
                        {!isSandbox && (
                            <div className="flex gap-2 mb-6 text-5xl">
                                {[1,2,3,4,5].map(star => (
                                    <i key={star} className={`fas fa-star ${star <= starsEarned ? 'text-yellow-400 drop-shadow-md' : 'text-gray-300'}`}></i>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-4">
                            <button onClick={() => setView(isSandbox ? 'menu' : 'levelSelect')} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-full text-xl shadow-lg">
                                ออกไปหน้าเมนู
                            </button>
                            {!isSandbox && levelId < 10 && (
                                <button onClick={() => { setView('levelSelect'); setTimeout(()=>setView('play'), 100); }} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full text-xl shadow-lg">
                                    ด่านต่อไป <i className="fas fa-arrow-right"></i>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div id="toast" className="hidden fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full opacity-0 transition-opacity duration-300 z-[2000]"></div>
        </div>
    );
}