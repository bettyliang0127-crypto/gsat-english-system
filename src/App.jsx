import { useState, useEffect, useRef } from 'react'

// --- 🔧 修復連線：指向雲端 Render ---
const API_BASE = "https://learn-english-wa5d.onrender.com";

function App() {
  const [mode, setMode] = useState('home');
  const [step, setStep] = useState(1);
  const [masteryStatus, setMasteryStatus] = useState('Report');

  // --- 🔧 修復抓題：改為動態獲取 ---
  const [currentQuestion, setCurrentQuestion] = useState(null);
  useEffect(() => {
    fetch(${API_BASE}/api/questions)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.data.length > 0) {
          setCurrentQuestion(data.data[Math.floor(Math.random() * data.data.length)]);
        }
      })
      .catch(e => {
        setCurrentQuestion({ Chinese: "人類的想像和創意是科技進步最大的驅動力。" });
        console.log("正在使用備援題目");
      });
  }, []);

  const question = currentQuestion?.Chinese || currentQuestion?.Question || "載入中...";

  // ☁️ 通用日誌函式：確保寫入 Google Sheets 成功
  const handleLog = async (sheetName, rowData) => {
    try {
      await fetch(${API_BASE}/api/log, {
        method: "POST",
        headers: { "Authorization": "Bearer 12345", "Content-Type": "application/json" },
        body: JSON.stringify({ "sheet_name": sheetName, "row_data": rowData })
      });
    } catch (e) { console.error("Log error", e); }
  };

  // --- 各模式專用狀態 ---
  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', content: '你好！關於這句翻譯，你的初步嘗試是什麼呢？' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isSocraticLoading, setIsSocraticLoading] = useState(false);
  const chatEndRef = useRef(null); 

  const [masteryInput, setMasteryInput] = useState('');
  const [masteryData, setMasteryData] = useState(null);
  const [isMasteryLoading, setIsMasteryLoading] = useState(false);

  const [chainingInput, setChainingInput] = useState('');
  const [chainingFeedback, setChainingFeedback] = useState('');
  const [isChainingLoading, setIsChainingLoading] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 1. 處理提示鏈模式提交
  const handleChainingSubmit = async () => {
    if (!chainingInput.trim()) return;
    setIsChainingLoading(true); setChainingFeedback('');
    try {
      const response = await fetch(${API_BASE}/api/eval_chaining, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, input: chainingInput })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setChainingFeedback(data.feedback);
      }
    } catch (err) { alert("連線發生錯誤"); }
    setIsChainingLoading(false);
  };

  // 2. 處理蘇格拉底模式發送訊息
  const handleSendSocratic = async () => {
    if (!inputValue.trim() || isSocraticLoading) return;
    const userMsg = { id: Date.now(), role: 'user', content: inputValue };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages); setInputValue(''); setIsSocraticLoading(true);
    try {
      const historyToSend = newMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model', content: m.content
      }));
      const response = await fetch(${API_BASE}/api/chat, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: historyToSend })
      });
      const data = await response.json();
      if (data.status === 'success') {
        const aiMsg = { id: Date.now() + 1, role: 'ai', content: data.reply };
        setMessages(prev => [...prev, aiMsg]);
        handleLog('Socratic', [new Date().toLocaleString(), '對話內容', inputValue, data.reply]);
      }
    } catch (err) { alert("連線發生錯誤"); }
    setIsSocraticLoading(false);
  };

  // 3. 處理精熟模式提交
  const handleMasterySubmit = async () => {
    if (!masteryInput.trim() || isMasteryLoading) return;
    setIsMasteryLoading(true);
    try {
      const evalRes = await fetch(${API_BASE}/api/eval_mastery, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, input: masteryInput })
      });
      const evalData = await evalRes.json();
      if (evalData.status === 'success') {
        setMasteryData(evalData.data);
        setMasteryStatus('Revise');
        handleLog('Mastery', [new Date().toLocaleString(), question, masteryInput, evalData.data.score]);
      }
    } catch (error) { alert("連線發生錯誤"); }
    setIsMasteryLoading(false);
  };

  // --- 視覺部分保持原樣 ---
  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-black text-slate-800 mb-2 leading-tight">學測英文翻譯之引導式學習系統</h1>
        </header>
        
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

          {mode === 'chaining' && (
            <div className="animate-in fade-in duration-500">
              <div className="flex gap-2 mb-6">
                {[1, 2, 3].map(i => <div key={i} className={`h-2 flex-1 rounded-full ${step >= i ? 'bg-blue-500' : 'bg-slate-100'}`} />)}
              </div>
              {step === 1 && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-xl text-blue-700 border-l-4 border-blue-500 text-sm">
                    <strong>Step 1: 識別句構</strong><br/>請先找出本句的「主詞」與「動詞」。
                  </div>
                  <input type="text" placeholder="例如：想像和創意 / 是" className="w-full border-2 p-4 rounded-xl outline-none" />
                  <button onClick={() => setStep(2)} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700">下一步</button>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-xl text-blue-700 border-l-4 border-blue-500 text-sm">
                    <strong>Step 2: 選擇詞彙</strong><br/>關鍵字：Imagination, Creativity, Driving force.
                  </div>
                  <button onClick={() => setStep(3)} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700">進入語法組合</button>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-xl text-blue-700 border-l-4 border-blue-500 text-sm">
                    <strong>Step 3: 語法組合</strong><br/>請嘗試拼湊完整翻譯，注意文法一致。
                  </div>
                  <textarea value={chainingInput} onChange={e => setChainingInput(e.target.value)} rows="4" className="w-full border-2 p-4 rounded-xl outline-none" placeholder="在此輸入您的整句翻譯..." />
                  {chainingFeedback && <div className="bg-green-50 p-4 rounded-xl text-green-800 border border-green-200 text-sm"><strong>AI 建議：</strong>{chainingFeedback}</div>}
                  <button onClick={handleChainingSubmit} disabled={isChainingLoading} className="w-full bg-green-600 text-white p-4 rounded-xl font-bold">{isChainingLoading ? "分析中..." : "提交分析"}</button>
                </div>
              )}
            </div>
          )}

          {mode === 'socratic' && (
            <div className="flex flex-col h-[500px]">
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 mb-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold shadow-sm ${msg.role === 'user' ? 'bg-emerald-500' : 'bg-slate-800 text-[10px]'}`}>
                      {msg.role === 'user' ? '學' : '導師'}
                    </div>
                    <div className={`p-4 rounded-2xl shadow-sm border max-w-[80%] ${msg.role === 'user' ? 'bg-slate-100 text-slate-700 ml-auto' : 'bg-emerald-50 text-emerald-800 mr-auto'}`}>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isSocraticLoading && <div className="text-xs text-slate-400 ml-14 animate-pulse">導師正在思考...</div>}
                <div ref={chatEndRef} />
              </div>
              <div className="relative flex gap-2 pt-4 border-t border-slate-100">
                <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendSocratic()}
                  placeholder="輸入您的修正或問題..." disabled={isSocraticLoading} className="flex-1 border-2 p-4 rounded-2xl outline-none" />
                <button onClick={handleSendSocratic} disabled={isSocraticLoading} className="bg-emerald-600 text-white px-8 rounded-2xl font-bold hover:bg-emerald-700">發送</button>
              </div>
            </div>
          )}

          {mode === 'mastery' && (
            <div className="text-center">
              <div className="inline-flex bg-slate-100 p-1 rounded-full mb-8">
                {['Report', 'Revise', 'Reflect'].map(m => (
                  <button key={m} onClick={() => setMasteryStatus(m)} className={`px-8 py-2 rounded-full text-sm font-bold transition ${masteryStatus === m ? 'bg-white shadow text-purple-600' : 'text-slate-400'}`}>
                    {m}
                  </button>
                ))}
              </div>
              {masteryStatus === 'Report' && (
                <div className="space-y-6">
                  <textarea value={masteryInput} onChange={(e) => setMasteryInput(e.target.value)} className="w-full border-2 p-4 rounded-2xl h-32 outline-none" placeholder="輸入初譯..." />
                  <button onClick={handleMasterySubmit} disabled={isMasteryLoading} className="w-full bg-purple-600 text-white p-4 rounded-2xl font-bold">{isMasteryLoading ? "評估中..." : "🚀 提交閱卷"}</button>
                </div>
              )}
              {masteryStatus === 'Revise' && (
                <div className="text-left space-y-4 animate-in fade-in">
                  {masteryData ? (
                    <>
                      <div className="text-2xl font-black text-purple-700">學測得分：{masteryData.score} / 5</div>
                      <div className="bg-red-50 p-4 rounded-xl text-red-700 text-sm">💡 <strong>錯誤：</strong>{masteryData.mistakes.join('、')}</div>
                      <div className="bg-emerald-50 p-4 rounded-xl text-emerald-700 text-sm">🌟 <strong>優點：</strong>{masteryData.good_points.join('、')}</div>
                      <div className="bg-blue-50 p-4 rounded-xl text-blue-800 font-medium">✨ <strong>參考答案：</strong>{masteryData.standard_answer}</div>
                    </>
                  ) : <div className="py-20">尚未有評分。</div>}
                </div>
              )}
              {masteryStatus === 'Reflect' && (
                <div className="space-y-4 text-left">
                  <div className="bg-purple-50 p-5 rounded-2xl border-l-8 border-purple-500">你學到了什麼以前沒注意的文法點？</div>
                  <textarea className="w-full border-2 p-4 rounded-2xl h-32" placeholder="紀錄你的心得..." />
                </div>
              )}
            </div>
          )}

          {mode === 'home' && (
            <div className="text-center py-20">
              <div className="text-7xl mb-4">🚀</div>
              <h3 className="text-xl font-bold">準備好開始學習了嗎？</h3>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App