import { useState, useEffect, useRef } from 'react'

// --- 🔧 修復連線：指向雲端 Render ---
const API_BASE = "https://learn-english-wa5d.onrender.com";

function App() {
  const [mode, setMode] = useState('home');
  // Chaining mode current step (1~4)
  const [step, setStep] = useState(1);
  const [masteryStatus, setMasteryStatus] = useState('Report');

  // --- 🔧 修復抓題：改為動態獲取 ---
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [fetchErrorMsg, setFetchErrorMsg] = useState('');
  useEffect(() => {
    fetch(`${API_BASE}/api/questions`)
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`連線失敗 (${res.status}): ${text.substring(0, 100)}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.status === 'success' && data.data.length > 0) {
          // 隨機抽一題
          setCurrentQuestion(data.data[Math.floor(Math.random() * data.data.length)]);
        } else {
          throw new Error(data.message || "題庫為空");
        }
      })
      .catch(e => {
        setFetchErrorMsg(e.toString());
        // 如果抓不到，使用備援假資料 (包含試算表的新欄位模擬)
        setCurrentQuestion({
          Chinese_Prompt: "123456789。",
          Step1_Question: "請問這句話的核心「主詞」與「動詞」結構為何？",
          Step1_Options: "A. 科技進步 / 是; B. 想像和創意 / 是; C. 最大 / 驅動力",
          Step1_Ans: "B",
          Step2_Question: "這句話描述跨越時間的客觀事實，請問主要子句應該使用哪種時態？",
          Step2_Options: "A. 未來式; B. 過去簡單式; C. 現在簡單式",
          Step2_Ans: "C",
          Step3_Template: "Human [blank] and [blank] are the largest [blank] of technological progress.",
          Step3_Answers: "imagination;creativity;driving force"
        });
        console.log("正在使用備援題目", e);
      });
  }, []);

  const question = currentQuestion?.Chinese_Prompt || currentQuestion?.Chinese || currentQuestion?.Question || "載入中...";

  // ☁️ 通用日誌函式：確保寫入 Google Sheets 成功
  const handleLog = async (sheetName, rowData) => {
    try {
      await fetch(`${API_BASE}/api/log`, {
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

  // --- 🌟 4階段提示鏈模式狀態 (資料庫解析) ---
  const chainingData = {
    step1Q: currentQuestion?.Step1_Question || "本句的主詞與動詞為何？",
    step1Opt: currentQuestion?.Step1_Options ? currentQuestion.Step1_Options.split(';') : ["A. 現代科技 / 是", "B. 想像和創意 / 是", "C. 驅動力 / 是"],
    step1Ans: currentQuestion?.Step1_Ans || "B",

    step2Q: currentQuestion?.Step2_Question || "這句話應該使用什麼時態？",
    step2Opt: currentQuestion?.Step2_Options ? currentQuestion.Step2_Options.split(';') : ["A. 過去單純式", "B. 現在簡單式", "C. 現在完成式"],
    step2Ans: currentQuestion?.Step2_Ans || "B",

    step3Tpl: currentQuestion?.Step3_Template || "Human [blank] and [blank] are the largest [blank] of technological progress.",
    step3Ans: currentQuestion?.Step3_Answers ? currentQuestion.Step3_Answers.split(';') : ["imagination", "creativity", "driving force"]
  };

  const [step1AnsCode, setStep1AnsCode] = useState('');
  const [step2AnsCode, setStep2AnsCode] = useState('');
  const [blankInputs, setBlankInputs] = useState([]);
  const [step1Status, setStep1Status] = useState(''); // 'pass' or 'fail'
  const [step2Status, setStep2Status] = useState('');
  const [step3Status, setStep3Status] = useState('');
  const [chainingInput, setChainingInput] = useState('');
  const [chainingFeedback, setChainingFeedback] = useState('');
  const [isChainingLoading, setIsChainingLoading] = useState(false);

  // 當題目切換 或 模式切換時，重置所有狀態
  useEffect(() => {
    setStep(1);
    setStep1AnsCode(''); setStep1Status('');
    setStep2AnsCode(''); setStep2Status('');
    setBlankInputs([]); setStep3Status('');
    setChainingInput(''); setChainingFeedback('');
    setMessages([{ id: 1, role: 'ai', content: '你好！關於這句翻譯，你的初步嘗試是什麼呢？' }]);
  }, [currentQuestion, mode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 1. 處理提示鏈模式提交 (Step 4 最終語法評估)
  const handleChainingSubmit = async () => {
    if (!chainingInput.trim()) return;
    setIsChainingLoading(true); setChainingFeedback('');
    try {
      const response = await fetch(`${API_BASE}/api/eval_chaining`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, input: chainingInput })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setChainingFeedback(data.feedback);
        handleLog('Chaining', [new Date().toLocaleString(), `提示鏈模式: ${question}`, chainingInput, data.feedback]);
        setStep(5); // 進入結果結算畫面
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

      // 偷藏一句提示，讓 AI 一開始就知道現在學生抽到什麼題目
      if (historyToSend.length > 0 && historyToSend[0].role === 'model') {
        historyToSend.unshift({
          role: 'user',
          content: `老師好，我正在練習英文翻譯，今天的題目是：「${question}」。請用語境引導我。`
        });
      }

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: historyToSend })
      });
      const data = await response.json();
      if (data.status === 'success') {
        const aiMsg = { id: Date.now() + 1, role: 'ai', content: data.reply };
        setMessages(prev => [...prev, aiMsg]);
        handleLog('Socratic', [new Date().toLocaleString(), '蘇格拉底對話', inputValue, data.reply]);
      }
    } catch (err) { alert("連線發生錯誤"); }
    setIsSocraticLoading(false);
  };

  // 3. 處理精熟模式提交
  const handleMasterySubmit = async () => {
    if (!masteryInput.trim() || isMasteryLoading) return;
    setIsMasteryLoading(true);
    try {
      const evalRes = await fetch(`${API_BASE}/api/eval_mastery`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, input: masteryInput })
      });
      const evalData = await evalRes.json();
      if (evalData.status === 'success') {
        setMasteryData(evalData.data);
        setMasteryStatus('Revise');
        handleLog('Mastery', [new Date().toLocaleString(), `精熟模式: ${question}`, masteryInput, evalData.data.score]);
      }
    } catch (error) { alert("連線發生錯誤"); }
    setIsMasteryLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-black text-slate-800 mb-2 leading-tight">學測英文翻譯之引導式學習系統</h1>
          {fetchErrorMsg && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-xl font-bold border-2 border-red-200">
              ⚠️ 連線題庫失敗：{fetchErrorMsg}<br/>
              <span className="text-sm font-normal">請檢查開發者工具終端機，或將此錯誤訊息告訴我。目前正在使用假資料測試。</span>
            </div>
          )}
        </header>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <button onClick={() => { setMode('chaining'); setStep(1); }}
            className={`p-4 rounded-2xl border-2 transition-all ${mode === 'chaining' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-white bg-white hover:border-blue-200'}`}>
            <div className="font-bold text-blue-600">提示鏈模式1</div>
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

          {/* 🌟 4階段提示鏈模式介面 🌟 */}
          {mode === 'chaining' && (
            <div className="animate-in fade-in duration-500">
              <div className="flex gap-2 mb-6">
                {[1, 2, 3, 4].map(i => <div key={i} className={`h-2 flex-1 rounded-full transition-all ${step >= i ? 'bg-blue-500' : 'bg-slate-100'}`} />)}
              </div>

              {/* Step 1: 識別句構 */}
              {step >= 1 && (
                <div className={`space-y-4 mb-8 ${step !== 1 && 'opacity-60 grayscale cursor-not-allowed pointer-events-none'}`}>
                  <div className="bg-blue-50 p-4 rounded-xl text-blue-800 border-l-4 border-blue-500 font-medium text-sm">
                    <strong>Step 1: 識別句構</strong><br />{chainingData.step1Q}
                  </div>
                  <div className="grid gap-2">
                    {chainingData.step1Opt.map(opt => {
                      const code = opt.trim().substring(0, 1);
                      const isSelected = step1AnsCode.toUpperCase() === code.toUpperCase();
                      return (
                        <button key={opt}
                          onClick={() => setStep1AnsCode(code)}
                          className={`p-4 text-left border-2 rounded-xl transition font-medium ${isSelected ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-100 hover:border-blue-300'}`}>
                          {opt.trim()}
                        </button>
                      );
                    })}
                  </div>
                  {step === 1 && (
                    <div className="pt-2">
                      <button onClick={() => {
                        if (step1AnsCode.toUpperCase() === chainingData.step1Ans.trim().toUpperCase()) {
                          setStep1Status('pass'); setStep(2);
                        } else { setStep1Status('fail'); }
                      }} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-md shadow-blue-100">驗證結構</button>
                      {step1Status === 'fail' && <p className="text-red-500 text-sm mt-3 font-medium text-center animate-bounce">❌ 答錯囉，請再想想看主詞和動詞的搭配！</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: 時態判斷 */}
              {step >= 2 && (
                <div className={`space-y-4 mb-8 animate-in slide-in-from-top-4 ${step !== 2 && 'opacity-60 grayscale cursor-not-allowed pointer-events-none'}`}>
                  <div className="bg-blue-50 p-4 rounded-xl text-blue-800 border-l-4 border-blue-500 font-medium text-sm">
                    <strong>Step 2: 時態判斷</strong><br />{chainingData.step2Q}
                  </div>
                  <div className="grid gap-2">
                    {chainingData.step2Opt.map(opt => {
                      const code = opt.trim().substring(0, 1);
                      const isSelected = step2AnsCode.toUpperCase() === code.toUpperCase();
                      return (
                        <button key={opt}
                          onClick={() => setStep2AnsCode(code)}
                          className={`p-4 text-left border-2 rounded-xl transition font-medium ${isSelected ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-100 hover:border-blue-300'}`}>
                          {opt.trim()}
                        </button>
                      );
                    })}
                  </div>
                  {step === 2 && (
                    <div className="pt-2">
                      <button onClick={() => {
                        if (step2AnsCode.toUpperCase() === chainingData.step2Ans.trim().toUpperCase()) {
                          setStep2Status('pass'); setStep(3);
                        } else { setStep2Status('fail'); }
                      }} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-md shadow-blue-100">驗證時態</button>
                      {step2Status === 'fail' && <p className="text-red-500 text-sm mt-3 font-medium text-center animate-bounce">❌ 時態不對喔，想想看它是事實還是發生的事情？</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: 核心字彙填空 */}
              {step >= 3 && (
                <div className={`space-y-4 mb-8 animate-in slide-in-from-top-4 ${step !== 3 && 'opacity-60 grayscale cursor-not-allowed pointer-events-none'}`}>
                  <div className="bg-blue-50 p-4 rounded-xl text-blue-800 border-l-4 border-blue-500 font-medium text-sm">
                    <strong>Step 3: 核心字彙</strong><br />請根據前面獲得的觀念，將單字補齊完成翻譯骨架。
                  </div>
                  <div className="text-lg leading-relaxed border-2 border-slate-100 p-8 rounded-2xl bg-slate-50 shadow-inner font-medium text-slate-700">
                    {chainingData.step3Tpl.split('[blank]').map((part, i, arr) => (
                      <span key={i}>
                        {part}
                        {i < arr.length - 1 && (
                          <input type="text"
                            value={blankInputs[i] || ''}
                            onChange={e => {
                              const newInputs = [...blankInputs];
                              newInputs[i] = e.target.value;
                              setBlankInputs(newInputs);
                            }}
                            placeholder="?"
                            className="mx-2 w-28 border-b-4 border-slate-300 focus:border-blue-500 outline-none text-center text-blue-600 font-bold bg-transparent transition-colors"
                          />
                        )}
                      </span>
                    ))}
                  </div>
                  {step === 3 && (
                    <div className="pt-2">
                      <button onClick={() => {
                        let pass = true;
                        for (let i = 0; i < chainingData.step3Ans.length; i++) {
                          const typed = (blankInputs[i] || '').trim().toLowerCase();
                          const ans = chainingData.step3Ans[i].trim().toLowerCase();
                          // Allow slight flexibility by simply ensuring the word matches
                          if (typed !== ans && !ans.includes(typed)) pass = false;
                          if (!typed) pass = false;
                        }
                        if (pass) { setStep3Status('pass'); setStep(4); }
                        else setStep3Status('fail');
                      }} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-md shadow-blue-100">驗證拼字</button>
                      {step3Status === 'fail' && <p className="text-red-500 text-sm mt-3 font-medium text-center animate-bounce">❌ 拼字有誤或有缺漏，加油再試一次！</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: 組合與潤飾 */}
              {step >= 4 && (
                <div className={`space-y-4 mb-8 animate-in slide-in-from-top-4 ${step !== 4 && 'opacity-60 grayscale pointer-events-none'}`}>
                  <div className="bg-blue-50 p-4 rounded-xl text-blue-800 border-l-4 border-blue-500 text-sm">
                    <strong>Step 4: 語法組合</strong><br />你已蒐集了所有這句翻譯需要的要素！請將它們全部組合起來，寫下最完美的翻譯。
                  </div>
                  <textarea value={chainingInput} onChange={e => setChainingInput(e.target.value)} rows="4" className="w-full border-2 border-slate-200 p-4 rounded-xl outline-none focus:ring-4 focus:ring-blue-50 transition-all font-medium text-slate-700" placeholder="在此輸入您的最終整句翻譯..." disabled={step !== 4} />
                  {step === 4 && (
                    <button onClick={handleChainingSubmit} disabled={isChainingLoading} className="w-full bg-green-600 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition shadow-md shadow-green-100 disabled:opacity-70 disabled:cursor-not-allowed">
                      {isChainingLoading ? "AI 嚴格分析中..." : "🚀 提交分析"}
                    </button>
                  )}
                </div>
              )}

              {/* Step 5: 結算與解析 */}
              {step === 5 && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 pt-4 border-t border-slate-200">
                  <div className="text-center">
                    <div className="text-5xl mb-4 animate-bounce">🎉</div>
                    <h3 className="text-2xl font-black text-slate-800">闖關完成！</h3>
                    <p className="text-slate-500 mt-2">來看看 AI 助教的點評與大考中心的資料吧</p>
                  </div>

                  <div className="bg-green-50 p-6 rounded-2xl border-2 border-green-200 shadow-sm">
                    <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">🤖 AI 專屬語法點評</h4>
                    <p className="text-green-900 leading-relaxed font-medium">{chainingFeedback}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                      <h4 className="font-bold text-blue-800 mb-2">✨ 大考中心標準解答</h4>
                      <p className="text-blue-900 font-medium">{currentQuestion?.Model_Answer || "資料表中未提供 (Model_Answer)"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                        <h4 className="font-bold text-purple-800 mb-2">📋 閱卷評分標準</h4>
                        <p className="text-purple-900 text-sm whitespace-pre-wrap">{currentQuestion?.Criteria || "資料表中未提供 (Criteria)"}</p>
                      </div>

                      <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                        <h4 className="font-bold text-red-800 mb-2">⚠️ 考生常見錯誤</h4>
                        <p className="text-red-900 text-sm whitespace-pre-wrap">{currentQuestion?.Common_Errors || "資料表中未提供 (Common_Errors)"}</p>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => { setMode('home'); }} className="w-full bg-slate-800 text-white p-4 rounded-xl font-bold hover:bg-slate-900 transition mt-4 shadow-lg">
                    回到首頁抽下一題
                  </button>
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
                      {msg.role === 'user' ? '學' : 'AI'}
                    </div>
                    <div className={`p-4 rounded-2xl shadow-sm border max-w-[80%] ${msg.role === 'user' ? 'bg-slate-100 text-slate-700 ml-auto' : 'bg-emerald-50 text-emerald-800 mr-auto'}`}>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isSocraticLoading && <div className="text-xs text-slate-400 ml-14 animate-pulse">正在思考...</div>}
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
                  ) : <div className="py-20 text-center text-slate-500">尚未有評分。</div>}
                </div>
              )}
              {masteryStatus === 'Reflect' && (
                <div className="space-y-4 text-left">
                  <div className="bg-purple-50 p-5 rounded-2xl border-l-8 border-purple-500 text-purple-800 font-medium">你學到了什麼以前沒注意的文法點？</div>
                  <textarea className="w-full border-2 p-4 rounded-2xl h-32 outline-none focus:border-purple-300" placeholder="紀錄你的心得..." />
                </div>
              )}
            </div>
          )}

          {mode === 'home' && (
            <div className="text-center py-20">
              <div className="text-7xl mb-4 animate-bounce">🚀</div>
              <h3 className="text-2xl font-bold text-slate-800">準備好開始學習了嗎？</h3>
              <p className="text-slate-500 mt-2 max-w-sm mx-auto">請從上方選擇一個過關模式</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App