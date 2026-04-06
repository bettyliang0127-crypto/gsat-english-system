import { useState, useEffect, useRef } from 'react'

function App() {
  const [mode, setMode] = useState('home');
  const [step, setStep] = useState(1);
  const [masteryStatus, setMasteryStatus] = useState('Report');

  // --- 蘇格拉底模式專用狀態 ---
  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', content: '你好！關於這句翻譯，你的初步嘗試是什麼呢？' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef(null); 

  // --- 精熟模式專用輸入狀態 ---
  const [masteryInput, setMasteryInput] = useState('');

  // 自動捲動到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- 測試發送至 Google Sheets 的函式 ---
  const testSubmitToSheets = () => {
    if (!masteryInput.trim()) {
      alert("請先輸入內容再測試發送！");
      return;
    }

    const value1 = new Date().toLocaleString(); // 時間戳記
    const value2 = "精熟模式初譯測試"; // 分類
    const value3 = masteryInput; // 學生輸入內容

    fetch("https://learn-english-wa5d.onrender.com", {
        method: "POST",
        headers: {
            "Authorization": "Bearer 12345", 
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "row_data": [value1, value2, value3] 
        })
    })
    .then(response => response.json())
    .then(data => {
        if(data.status === "success"){
            alert("資料新增成功！請馨勻確認 Google Sheets。");
            console.log("後端回應:", data);
        } else {
            alert("錯誤: " + data.message);
        }
    })
    .catch(error => {
      alert("連線發生錯誤，請檢查 Flask 是否啟動。");
      console.error("連線發生錯誤:", error);
    });
  };

  // 處理蘇格拉底模式發送訊息邏輯
  const handleSendSocratic = () => {
    if (!inputValue.trim()) return;

    const userMsg = { id: Date.now(), role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    setTimeout(() => {
      const aiMsg = { 
        id: Date.now() + 1, 
        role: 'ai', 
        content: '這是一個很好的嘗試！但注意到「想像」與「創意」是兩個主體，動詞用單數 is 真的合適嗎？' 
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 1000);
  };

  const question = "人類的想像和創意是科技進步最大的驅動力。";

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-black text-slate-800 mb-2 text-balance leading-tight">學測英文翻譯之引導式學習系統</h1>
        </header>
        
        {/* 模式導航區 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <button onClick={() => {setMode('chaining'); setStep(1);}} 
            className={`p-4 rounded-2xl border-2 transition-all ${mode === 'chaining' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-white bg-white hover:border-blue-200'}`}>
            <div className="font-bold text-blue-600">提示鏈模式</div>
            <div className="text-xs text-slate-400">任務拆解與結構引導</div>
          </button>
          <button onClick={() => setMode('socratic')} 
            className={`p-4 rounded-2xl border-2 transition-all ${mode === 'socratic' ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-white bg-white hover:border-emerald-200'}`}>
            <div className="font-bold text-emerald-600">蘇格拉底模式</div>
            <div className="text-xs text-slate-400">邏輯啟發與對話中介</div>
          </button>
          <button onClick={() => setMode('mastery')} 
            className={`p-4 rounded-2xl border-2 transition-all ${mode === 'mastery' ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-white bg-white hover:border-purple-200'}`}>
            <div className="font-bold text-purple-600">精熟學習模式</div>
            <div className="text-xs text-slate-400">3R 迴路與零錯誤挑戰</div>
          </button>
        </div>

        <main className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
          <div className="bg-slate-800 p-6 rounded-2xl mb-8">
            <span className="text-slate-400 text-sm font-bold tracking-widest uppercase">Translation Task</span>
            <h2 className="text-white text-xl mt-2">{question}</h2>
          </div>

          {/* 1. 提示鏈模式介面 */}
          {mode === 'chaining' && (
            <div className="animate-in fade-in duration-500">
              <div className="flex gap-2 mb-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`h-2 flex-1 rounded-full ${step >= i ? 'bg-blue-500' : 'bg-slate-100'}`} />
                ))}
              </div>
              {step === 1 && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-xl text-blue-700 border-l-4 border-blue-500 text-sm">
                    <strong>Step 1: 識別句構</strong><br/>請先找出本句的「主詞」與「動詞」。
                  </div>
                  <input type="text" placeholder="例如：想像和創意 / 是" className="w-full border-2 p-4 rounded-xl focus:ring-2 ring-blue-200 outline-none" />
                  <button onClick={() => setStep(2)} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition">下一步</button>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-xl text-blue-700 border-l-4 border-blue-500 text-sm">
                    <strong>Step 2: 選擇詞彙</strong><br/>系統推薦大考 4500 單字。
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Imagination', 'Creativity', 'Driving force', 'Technological progress'].map(w => (
                      <span key={w} className="bg-white border-2 border-blue-100 px-4 py-2 rounded-full text-blue-600 text-sm font-medium">{w}</span>
                    ))}
                  </div>
                  <button onClick={() => setStep(3)} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition">進入語法組合</button>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-xl text-blue-700 border-l-4 border-blue-500 text-sm">
                    <strong>Step 3: 語法組合</strong><br/>請組合整句，注意最高級用法。
                  </div>
                  <textarea rows="4" className="w-full border-2 p-4 rounded-xl focus:ring-2 ring-blue-200 outline-none" placeholder="在此輸入您的整句翻譯..."></textarea>
                  <button className="w-full bg-green-600 text-white p-4 rounded-xl font-bold hover:bg-green-700 transition">提交並分析成果</button>
                </div>
              )}
            </div>
          )}

          {/* 2. 蘇格拉底模式介面 */}
          {mode === 'socratic' && (
            <div className="flex flex-col h-[500px]">
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 mb-4 flex flex-col custom-scrollbar">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex items-start gap-4 w-full ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold shadow-sm ${msg.role === 'user' ? 'bg-emerald-500' : 'bg-slate-800 text-[10px]'}`}>
                      {msg.role === 'user' ? '學' : '導師'}
                    </div>
                    <div className={`p-4 rounded-2xl shadow-sm border max-w-[80%] ${
                      msg.role === 'user' 
                        ? 'bg-slate-100 text-slate-700 rounded-tr-none border-slate-200 ml-auto' 
                        : 'bg-emerald-50 text-emerald-800 border-emerald-100 rounded-tl-none mr-auto'
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100">
                <div className="relative flex gap-2">
                  <input 
                    type="text" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendSocratic()}
                    placeholder="輸入您的修正或問題..." 
                    className="flex-1 border-2 border-slate-200 p-4 rounded-2xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all"
                  />
                  <button onClick={handleSendSocratic} className="bg-emerald-600 text-white px-6 rounded-2xl hover:bg-emerald-700 transition font-bold">發送</button>
                </div>
              </div>
            </div>
          )}

          {/* 3. 精熟學習模式介面 */}
          {mode === 'mastery' && (
            <div className="text-center">
              <div className="inline-flex bg-slate-100 p-1 rounded-full mb-8">
                {['Report', 'Revise', 'Reflect'].map(m => (
                  <button key={m} onClick={() => setMasteryStatus(m)}
                    className={`px-6 py-2 rounded-full text-sm font-bold transition ${masteryStatus === m ? 'bg-white shadow text-purple-600' : 'text-slate-400'}`}>
                    {m}
                  </button>
                ))}
              </div>
              
              {masteryStatus === 'Report' && (
                <div className="space-y-6 py-4 animate-in fade-in">
                  <div className="text-slate-500 text-sm mb-4 italic">請輸入初譯以開始精熟挑戰，這將測試發送至 Google Sheets</div>
                  <textarea 
                    value={masteryInput}
                    onChange={(e) => setMasteryInput(e.target.value)}
                    className="w-full border-2 p-4 rounded-2xl focus:ring-4 focus:ring-purple-50 focus:border-purple-400 outline-none transition-all h-32"
                    placeholder="在此輸入您的完整翻譯..."
                  ></textarea>
                  <button 
                    onClick={testSubmitToSheets}
                    className="w-full bg-purple-600 text-white p-4 rounded-2xl font-bold hover:bg-purple-700 shadow-lg shadow-purple-100 transition-all flex items-center justify-center gap-2"
                  >
                    🚀 測試發送至雲端表單
                  </button>
                </div>
              )}
              
              {masteryStatus === 'Revise' && <div className="text-purple-700 font-medium py-20 bg-purple-50 rounded-2xl border border-purple-100">系統偵測到語法不夠精準，請參考 RAG 標準修正。</div>}
              
              {masteryStatus === 'Reflect' && (
                <div className="space-y-4 text-left animate-in slide-in-from-top-2">
                  <p className="text-slate-600 bg-purple-50 p-5 rounded-2xl border-l-8 border-purple-500 leading-relaxed">
                    <strong>思考題：</strong> 通關成功！你認為在表達「驅動力」時，使用 <u>driving force</u> 的原因是什麼？
                  </p>
                  <textarea className="w-full border-2 p-4 rounded-2xl focus:border-purple-400 outline-none h-32" placeholder="輸入你的反思心得..."></textarea>
                </div>
              )}
            </div>
          )}

          {mode === 'home' && (
            <div className="text-center py-24 space-y-6">
              <div className="text-7xl animate-bounce">🚀</div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-700">準備好開始學習了嗎？</h3>
                <p className="text-slate-400 max-w-sm mx-auto">請從上方選擇一個導航模式進入 ZPD 鷹架支援系統</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App