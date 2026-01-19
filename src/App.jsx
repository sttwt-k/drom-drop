import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  onSnapshot, 
  serverTimestamp, 
  setDoc,
  getDoc
} from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  Camera, 
  Clock, 
  CheckCircle, 
  Box, 
  User, 
  X,
  History,
  Home,
  Settings,
  PenTool,
  Eraser,
  Save,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
  Database,
  Package as PackageIcon,
  ChevronDown,
  Filter
} from 'lucide-react';

// ==========================================
// ส่วนที่ 1: การตั้งค่า (Config)
// ==========================================

const MY_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDFah-LOjrjtqm3JqVZAQ88S9KTlVtprb8",
  authDomain: "dormdrop-c016b.firebaseapp.com",
  projectId: "dormdrop-c016b",
  storageBucket: "dormdrop-c016b.firebasestorage.app",
  messagingSenderId: "423788710268",
  appId: "1:423788710268:web:865810081da14be753bcf9"
};

// ==========================================
// ส่วนที่ 2: ระบบจัดการ Firebase
// ==========================================

let app, auth, db;
let appId = 'dorm-main'; 
let initError = null;

try {
  let config = MY_FIREBASE_CONFIG;
  if (!config && typeof __firebase_config !== 'undefined') {
    config = JSON.parse(__firebase_config);
    if (typeof __app_id !== 'undefined') appId = __app_id;
  }
  if (config) {
    app = !getApps().length ? initializeApp(config) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    throw new Error("ไม่พบการตั้งค่า Firebase");
  }
} catch (e) {
  initError = e.message;
  console.error("Firebase Init Error:", e);
}

// ==========================================
// ส่วนที่ 3: Components UI สวยงาม
// ==========================================

// Signature Pad (กระดานเซ็นชื่อ)
const SignaturePad = ({ onSave }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d').scale(ratio, ratio);
    }
  }, []);

  const getCoordinates = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (event.touches && event.touches[0]) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e) => {
    if (e.cancelable) e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2563eb'; // สีน้ำเงิน
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (onSave && canvasRef.current) onSave(canvasRef.current.toDataURL());
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
      if (onSave) onSave(null);
    }
  };

  return (
    <div className="relative w-full h-48 bg-white border-2 border-dashed border-indigo-200 rounded-2xl overflow-hidden touch-none shadow-inner">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        style={{ width: '100%', height: '100%' }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <button type="button" onClick={clearCanvas} className="absolute top-3 right-3 p-2 bg-white shadow-md rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
        <Eraser className="w-5 h-5" />
      </button>
      <div className="absolute bottom-3 left-3 text-xs text-indigo-300 pointer-events-none font-medium bg-white/80 px-2 py-1 rounded">
        เซ็นชื่อในกรอบนี้
      </div>
    </div>
  );
};

const resizeImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Component ป้ายสถานะสวยๆ
const CarrierBadge = ({ carrier }) => {
    const colors = {
      'Kerry': 'bg-orange-500 text-white',
      'Flash': 'bg-yellow-400 text-yellow-900',
      'Thai Post': 'bg-red-500 text-white',
      'J&T': 'bg-red-600 text-white',
      'Lazada': 'bg-blue-600 text-white',
      'Shopee': 'bg-orange-600 text-white',
      'อื่นๆ': 'bg-gray-500 text-white',
    };
    const carrierName = typeof carrier === 'string' ? carrier : 'อื่นๆ';
    return (
      <span className={`text-[10px] px-2 py-1 rounded-md font-bold shadow-sm tracking-wide ${colors[carrierName] || colors['อื่นๆ']}`}>
        {carrierName.toUpperCase()}
      </span>
    );
};

// ==========================================
// ส่วนที่ 4: Main Application Logic
// ==========================================

function DormDropApp() {
  const [user, setUser] = useState(null);
  const [packages, setPackages] = useState([]);
  const [view, setView] = useState('list'); 
  const [selectedRoom, setSelectedRoom] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [historyDetailPackage, setHistoryDetailPackage] = useState(null);

  const [config, setConfig] = useState({
    carriers: ['Kerry', 'Flash', 'Thai Post', 'J&T', 'Lazada', 'Shopee', 'อื่นๆ'],
    types: ['กล่อง', 'ซอง', 'ถุง', 'อาหาร/น้ำ', 'ใหญ่พิเศษ']
  });

  const [formData, setFormData] = useState({
    room: '',
    tracking: '',
    carrier: '', 
    type: '', 
    sender: '',
    image: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [signatureImage, setSignatureImage] = useState(null);

  useEffect(() => {
    if (!auth) return; 
    const initAuth = async () => {
        try { await signInAnonymously(auth); } 
        catch (error) { setDbError("Login failed: " + error.message); }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    setLoading(true);
    setDbError(null);
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'packages'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          pickedUpAt: data.pickedUpAt?.toDate ? data.pickedUpAt.toDate() : null
        };
      });
      items.sort((a, b) => b.createdAt - a.createdAt);
      setPackages(items);
      setLoading(false);
    }, (error) => {
        setLoading(false);
        if (error.code === 'permission-denied') setDbError("สิทธิ์ไม่ถูกต้อง (Permission Denied)");
        else setDbError("โหลดข้อมูลไม่สำเร็จ");
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !db) return;
    const configDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
    const unsubscribe = onSnapshot(configDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setConfig({
          carriers: Array.isArray(data.carriers) ? data.carriers : config.carriers,
          types: Array.isArray(data.types) ? data.types : config.types
        });
        if (data.carriers?.length > 0 && !formData.carrier) setFormData(prev => ({ ...prev, carrier: data.carriers[0] }));
        if (data.types?.length > 0 && !formData.type) setFormData(prev => ({ ...prev, type: data.types[0] }));
      } else {
        setDoc(configDocRef, config).catch(err => console.error(err));
        if(!formData.carrier) setFormData(prev => ({ ...prev, carrier: config.carriers[0] }));
        if(!formData.type) setFormData(prev => ({ ...prev, type: config.types[0] }));
      }
    });
    return () => unsubscribe();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const resized = await resizeImage(file);
        setFormData(prev => ({ ...prev, image: resized }));
      } catch (err) { alert("Error uploading image"); }
    }
  };

  const handleAddPackage = async (e) => {
    e.preventDefault();
    if (!formData.room || !formData.tracking) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'packages'), {
        ...formData,
        status: 'pending',
        createdAt: serverTimestamp(),
        receiver: '',
        signature: null,
        pickedUpAt: null
      });
      setFormData(prev => ({ ...prev, room: '', tracking: '', sender: '', image: null }));
      setView('list');
      setSelectedRoom(null);
    } catch (err) { alert("Failed: " + err.message); } 
    finally { setIsSubmitting(false); }
  };

  const handleReceivePackage = async () => {
    if (!selectedPackage || (!receiverName && !signatureImage)) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'packages', selectedPackage.id);
      await updateDoc(docRef, {
        status: 'picked_up',
        receiver: receiverName,
        signature: signatureImage,
        pickedUpAt: serverTimestamp()
      });
      setSelectedPackage(null);
      setReceiverName('');
      setSignatureImage(null);
    } catch (err) { alert("Update failed"); }
  };

  const handleAddConfig = async (key, value) => {
    if (!value.trim()) return;
    const newConfig = { ...config, [key]: [...(config[key]||[]), value] };
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), newConfig); } catch (e) {}
  };

  const handleDeleteConfig = async (key, value) => {
    const newConfig = { ...config, [key]: (config[key]||[]).filter(item => item !== value) };
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), newConfig); } catch (e) {}
  };

  const isWithinLastMonth = (date) => {
    if (!date) return false;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return date > oneMonthAgo;
  };

  const allPendingPackages = packages.filter(p => p.status === 'pending');
  const historyPackages = packages.filter(p => 
    p.status === 'picked_up' && 
    isWithinLastMonth(p.createdAt) &&
    (String(p.room).includes(searchTerm) || String(p.tracking).includes(searchTerm))
  );

  const getGroupedPackages = () => {
    const grouped = {};
    allPendingPackages.forEach(pkg => {
      const room = pkg.room;
      if (searchTerm) {
        if (!String(room).includes(searchTerm) && 
            !String(pkg.tracking).includes(searchTerm) && 
            !String(pkg.carrier).includes(searchTerm)) return;
      }
      if (!grouped[room]) grouped[room] = [];
      grouped[room].push(pkg);
    });
    return grouped;
  };

  const groupedPackages = getGroupedPackages();
  const roomKeys = Object.keys(groupedPackages).sort();
  const packagesInSelectedRoom = selectedRoom ? allPendingPackages.filter(p => p.room === selectedRoom) : [];

  // Loading Screen
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-400 text-sm font-medium">กำลังโหลดข้อมูล...</p>
    </div>
  );

  if (dbError) return (
    <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-6 text-center">
      <Database className="w-16 h-16 text-red-400 mb-4" />
      <h2 className="text-lg font-bold text-red-800 mb-2">เชื่อมต่อฐานข้อมูลไม่ได้</h2>
      <p className="text-sm text-red-600 bg-white p-4 rounded-xl shadow-sm border border-red-100">{dbError}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-24 md:pb-0">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl relative overflow-hidden">
        
        {/* === Header === */}
        <div className="bg-white/80 backdrop-blur-md px-5 py-4 sticky top-0 z-20 border-b border-slate-100">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 flex items-center gap-2">
              <Box className="w-7 h-7 text-indigo-600" fill="currentColor" />
              DormDrop
            </h1>
            <div className="flex items-center gap-2">
              {allPendingPackages.length > 0 && (
                <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse">
                  {allPendingPackages.length} ค้างรับ
                </div>
              )}
              <button onClick={() => { setView('settings'); setSelectedRoom(null); }} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {(view === 'list' || view === 'roomDetail' || view === 'history') && (
            <div className="relative group">
              <input
                type="text"
                placeholder="ค้นหาเลขห้อง / เลขพัสดุ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all shadow-inner"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3 group-focus-within:text-indigo-500 transition-colors" />
            </div>
          )}
        </div>

        {/* === Main Content Area === */}
        <div className="p-5">
          
          {/* --- SETTINGS VIEW --- */}
          {view === 'settings' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-slate-800">ตั้งค่าระบบ</h2>
              </div>
              
              {['carriers', 'types'].map((key) => (
                <div key={key} className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                    {key === 'carriers' ? '🚚 ขนส่ง (Carriers)' : '📦 ประเภท (Types)'}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {config[key].map((item, idx) => (
                      <div key={idx} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
                        {item}
                        <button onClick={() => handleDeleteConfig(key, item)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder={`เพิ่ม ${key === 'carriers' ? 'ขนส่ง' : 'ประเภท'}...`}
                      className="flex-1 p-3 bg-slate-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-indigo-500"
                      onKeyDown={(e) => { if(e.key === 'Enter') { handleAddConfig(key, e.target.value); e.target.value = ''; }}}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* --- ADD PACKAGE VIEW --- */}
          {view === 'add' && (
            <div className="animate-fade-in pb-10">
              <h2 className="text-xl font-bold mb-5 flex items-center gap-2 text-slate-800">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                  <Plus className="w-5 h-5" />
                </div>
                เพิ่มพัสดุใหม่
              </h2>
              
              <form onSubmit={handleAddPackage} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">เลขห้อง *</label>
                    <input
                      type="text" name="room" required
                      value={formData.room} onChange={handleInputChange}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl text-lg font-bold text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="304"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">ขนส่ง</label>
                    <div className="relative">
                      <select
                        name="carrier" value={formData.carrier} onChange={handleInputChange}
                        className="w-full p-4 bg-slate-50 border-none rounded-2xl appearance-none font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        {config.carriers.map((c, i) => <option key={i} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-4 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">เลขพัสดุ *</label>
                  <input
                    type="text" name="tracking" required
                    value={formData.tracking} onChange={handleInputChange}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="สแกน หรือ พิมพ์เลขพัสดุ"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">ประเภท</label>
                    <select
                      name="type" value={formData.type} onChange={handleInputChange}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-medium outline-none"
                    >
                       {config.types.map((t, i) => <option key={i} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">ผู้ส่ง (ถ้ามี)</label>
                    <input
                      type="text" name="sender"
                      value={formData.sender} onChange={handleInputChange}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-medium outline-none"
                      placeholder="เช่น แม่"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 ml-1">รูปถ่ายหลักฐาน</label>
                  <div className="relative group cursor-pointer">
                    <input
                      type="file" accept="image/*" capture="environment" 
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                    />
                    <div className={`w-full h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all ${formData.image ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                      {formData.image ? (
                        <div className="relative w-full h-full p-2">
                          <img src={formData.image} alt="Preview" className="w-full h-full object-cover rounded-xl shadow-md" />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                            <Camera className="text-white w-8 h-8" />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="bg-white p-3 rounded-full shadow-sm mb-2">
                            <Camera className="w-6 h-6 text-indigo-500" />
                          </div>
                          <span className="text-xs font-bold text-slate-400">แตะเพื่อถ่ายรูป</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setView('list')} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors">
                    ยกเลิก
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-70 disabled:scale-100">
                    {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกพัสดุ'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* --- ROOM LIST VIEW --- */}
          {view === 'list' && (
            <div className="space-y-3 pb-20">
              {roomKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                  <PackageIcon className="w-16 h-16 text-slate-300 mb-3" />
                  <p className="text-slate-400 font-medium">ไม่มีพัสดุตกค้าง</p>
                </div>
              ) : (
                roomKeys.map(room => (
                   <div 
                      key={room}
                      onClick={() => { setSelectedRoom(room); setView('roomDetail'); }}
                      className="bg-white p-5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer group hover:border-indigo-100"
                   >
                      <div className="flex items-center gap-4">
                          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 font-bold text-lg">
                               {room}
                          </div>
                          <div>
                              <div className="text-sm text-slate-500 font-medium mb-0.5">ห้องพัก</div>
                              <div className="text-lg font-extrabold text-slate-800 flex items-baseline gap-1">
                                {groupedPackages[room].length} <span className="text-xs font-normal text-slate-400">พัสดุ</span>
                              </div>
                          </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                      </div>
                   </div>
                ))
              )}
            </div>
          )}

          {/* --- ROOM DETAIL VIEW --- */}
          {view === 'roomDetail' && selectedRoom && (
             <div className="space-y-4 animate-fade-in pb-20">
                <button 
                  onClick={() => { setView('list'); setSelectedRoom(null); }}
                  className="flex items-center gap-1 text-slate-500 mb-2 hover:text-indigo-600 font-medium text-sm pl-1"
                >
                    <ArrowLeft className="w-4 h-4" /> กลับหน้ารวม
                </button>
                
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-4 text-white shadow-lg flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                            <Home className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-300">กำลังดูรายการของ</p>
                            <h2 className="text-xl font-bold">ห้อง {selectedRoom}</h2>
                        </div>
                    </div>
                    <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                        {packagesInSelectedRoom.length} รายการ
                    </div>
                </div>

                <div className="space-y-3">
                   {packagesInSelectedRoom.map(pkg => (
                      <div key={pkg.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
                        <div className="flex gap-4">
                            {/* รูปภาพพัสดุ */}
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-100 relative">
                                {pkg.image ? (
                                    <img src={pkg.image} alt="Package" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <PackageIcon className="w-8 h-8" />
                                    </div>
                                )}
                            </div>
                            
                            {/* รายละเอียด */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <CarrierBadge carrier={pkg.carrier} />
                                    <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{pkg.type}</span>
                                </div>
                                <h3 className="font-bold text-slate-800 text-lg truncate mb-0.5">{pkg.tracking}</h3>
                                {pkg.sender && (
                                    <p className="text-xs text-slate-500">จาก: <span className="font-medium text-slate-700">{pkg.sender}</span></p>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                                <Clock className="w-3.5 h-3.5" /> 
                                {pkg.createdAt instanceof Date ? pkg.createdAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '...'}
                            </div>
                            <button
                                onClick={() => setSelectedPackage(pkg)}
                                className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-200 active:scale-95 transition-all flex items-center gap-1.5 hover:bg-indigo-700"
                            >
                                <CheckCircle className="w-4 h-4" /> รับของ
                            </button>
                        </div>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {/* --- HISTORY VIEW --- */}
          {view === 'history' && (
            <div className="space-y-4 pb-20">
              <div className="flex items-center justify-between">
                 <h2 className="text-lg font-bold text-slate-800">ประวัติการรับ (1 เดือน)</h2>
                 <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100">{historyPackages.length} รายการ</span>
              </div>
              
              {historyPackages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                  <History className="w-16 h-16 text-slate-300 mb-3" />
                  <p className="text-slate-400 font-medium">ไม่มีประวัติการรับ</p>
                </div>
              ) : (
                historyPackages.map(pkg => (
                  <div key={pkg.id} onClick={() => setHistoryDetailPackage(pkg)} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex gap-4 items-center group">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${pkg.room ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                        {pkg.room || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-slate-800 truncate pr-2">{pkg.tracking}</span>
                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">รับแล้ว</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                             <User className="w-3 h-3" /> {pkg.receiver || "ไม่ระบุ"}
                             <span className="text-slate-300">•</span>
                             <Clock className="w-3 h-3" /> {pkg.pickedUpAt instanceof Date ? pkg.pickedUpAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '-'}
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* === Modals === */}

        {/* Receive Modal */}
        {selectedPackage && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="bg-white w-full max-w-sm rounded-t-3xl md:rounded-3xl p-6 shadow-2xl animate-slide-up md:animate-scale-in">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-500" /> ยืนยันการรับของ
                </h3>
                <button onClick={() => { setSelectedPackage(null); setSignatureImage(null); }} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
                <div className="flex justify-between mb-1"><span className="text-slate-500 text-sm">ห้อง:</span> <span className="font-bold text-slate-800">{selectedPackage.room}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 text-sm">พัสดุ:</span> <span className="font-bold text-slate-800 truncate max-w-[150px]">{selectedPackage.tracking}</span></div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">ชื่อผู้รับ</label>
                  <input
                    type="text" placeholder="พิมพ์ชื่อผู้รับ..."
                    className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none transition-colors font-medium"
                    value={receiverName} onChange={(e) => setReceiverName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">ลายเซ็น</label>
                  <SignaturePad onSave={setSignatureImage} />
                </div>
              </div>

              <button
                onClick={handleReceivePackage}
                disabled={!receiverName && !signatureImage}
                className="w-full py-4 bg-green-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
              >
                <Save className="w-5 h-5" /> ยืนยันรับพัสดุ
              </button>
            </div>
          </div>
        )}

        {/* History Detail Modal */}
        {historyDetailPackage && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-in max-h-[85vh] overflow-y-auto">
                  <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-slate-800">รายละเอียดพัสดุ</h3>
                      <button onClick={() => setHistoryDetailPackage(null)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100">
                          <X className="w-5 h-5 text-slate-500" />
                      </button>
                  </div>

                  <div className="space-y-5">
                      {/* Image */}
                      <div className="w-full aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center">
                          {historyDetailPackage.image ? (
                              <img src={historyDetailPackage.image} alt="Package" className="w-full h-full object-contain" />
                          ) : (
                              <div className="flex flex-col items-center text-slate-300">
                                  <Camera className="w-10 h-10 mb-2" />
                                  <span className="text-xs">ไม่มีรูปภาพ</span>
                              </div>
                          )}
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 p-3 rounded-xl">
                              <span className="text-xs text-slate-400 block mb-1">เลขห้อง</span>
                              <span className="text-lg font-bold text-slate-800">{historyDetailPackage.room}</span>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl">
                              <span className="text-xs text-slate-400 block mb-1">สถานะ</span>
                              <span className="text-sm font-bold text-green-600 bg-green-100 px-2 py-1 rounded-md inline-block">รับแล้ว</span>
                          </div>
                      </div>

                      {/* Full Info */}
                      <div className="space-y-3">
                          <div className="border-b border-slate-100 pb-2">
                              <span className="text-xs text-slate-400">เลขพัสดุ</span>
                              <p className="font-mono text-slate-700 break-all">{historyDetailPackage.tracking}</p>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-2">
                              <div>
                                  <span className="text-xs text-slate-400">ขนส่ง</span>
                                  <p className="text-sm font-medium text-slate-700">{historyDetailPackage.carrier}</p>
                              </div>
                              <div className="text-right">
                                  <span className="text-xs text-slate-400">ประเภท</span>
                                  <p className="text-sm font-medium text-slate-700">{historyDetailPackage.type}</p>
                              </div>
                          </div>
                      </div>

                      {/* Receiver Section */}
                      <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                          <div className="flex items-center gap-2 mb-3">
                              <div className="bg-green-200 p-1.5 rounded-full text-green-700"><User className="w-4 h-4" /></div>
                              <span className="font-bold text-green-800 text-sm">ข้อมูลผู้รับ</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-xs text-green-600">ชื่อ:</span>
                              <span className="font-bold text-green-800">{historyDetailPackage.receiver}</span>
                          </div>
                          <div className="flex justify-between items-center mb-3">
                              <span className="text-xs text-green-600">เวลา:</span>
                              <span className="text-xs font-medium text-green-800">{historyDetailPackage.pickedUpAt instanceof Date ? historyDetailPackage.pickedUpAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                          </div>
                          {historyDetailPackage.signature && (
                              <div className="bg-white p-2 rounded-xl border border-green-100">
                                  <img src={historyDetailPackage.signature} alt="Signature" className="h-12 w-auto mx-auto" />
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
        )}

        {/* === Bottom Navigation === */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 px-6 pb-6 pt-2 md:pb-2 flex justify-between items-end max-w-md mx-auto z-40">
          <button 
            onClick={() => { setView('list'); setSelectedRoom(null); }}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${view === 'list' || view === 'roomDetail' ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-indigo-400'}`}
          >
            <Home className="w-6 h-6" fill={view === 'list' ? "currentColor" : "none"} />
            <span className="text-[10px] font-bold">หน้าหลัก</span>
          </button>

          <button 
            onClick={() => { setView('add'); setSelectedRoom(null); }}
            className="flex flex-col items-center justify-center -mt-8 bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-full w-16 h-16 shadow-lg shadow-indigo-300 border-4 border-slate-50 transform transition-transform hover:scale-110 active:scale-95"
          >
            <Plus className="w-8 h-8" />
          </button>

          <button 
            onClick={() => { setView('history'); setSelectedRoom(null); }}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${view === 'history' ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-indigo-400'}`}
          >
            <History className="w-6 h-6" />
            <span className="text-[10px] font-bold">ประวัติ</span>
          </button>
        </div>

      </div>
    </div>
  );
}

// Wrapper
export default function App() {
  if (initError) return <div className="text-center p-10 text-red-500">Firebase Error: {initError}</div>;
  return <DormDropApp />;
}