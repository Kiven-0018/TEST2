// ✅ Optimized chatbot.js - Clean, high-performance version
console.log("✅ chatbot.js loaded");

let messages = JSON.parse(localStorage.getItem("chatMessages")) || [];

window.addEventListener("DOMContentLoaded", () => {
  const chatWindow   = document.getElementById("chat-window");
  const messageInput = document.getElementById("messageInput");
  const apiKeyInput  = document.getElementById("apiKey");
  const sendBtn      = document.getElementById("sendBtn");
  const clearBtn     = document.getElementById("clearBtn");
  const roleDef      = document.getElementById("roleDef");
  const tempSlider   = document.getElementById("temperature");
  const tempValue    = document.getElementById("tempValue");
  const name = document.getElementById("your-ID-number");
  const word = document.getElementById("your-major");
  const loginBtn = document.getElementById("loginBtn");


  apiKeyInput.value = localStorage.getItem("apiKey") || "";


  // Temperature display
  tempValue.textContent = tempSlider.value;
  tempSlider.addEventListener("input", () => {
    tempValue.textContent = tempSlider.value;
  });
  //登录
  loginBtn.addEventListener("click", login);
  document.getElementById("logoutBtn").addEventListener("click", logout);
  async function login() {
  const id = name.value;
  const major = word.value;

//    const username = name.value
//    const password = word.value
    if (!id){
      return alert('请输入账号');
    }
    if (!major) {
      return alert('请输入密码');
    }

    const res = await fetch("http://127.0.0.1:5001/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, major })  //
//      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const err = await res.json();
      alert("账号或密码不正确");
      return;
    }

    const data = await res.json();
    document.getElementById('loginModal').style.display = 'none';
    alert('登录成功')
    localStorage.setItem('user', JSON.stringify(data.user));
    updateLoginStatus();
  }

  function logout() {
      localStorage.removeItem('user');
      updateLoginStatus();
      alert('You have been logged out.');
  }

  function updateLoginStatus() {
       const user = JSON.parse(localStorage.getItem('user'));
       const loginText = document.getElementById('loginText');
       const logoutBtn = document.getElementById('logoutBtn');
       const userAvatar = document.getElementById('userAvatar');

       if (user) {
           loginText.textContent = `User: ${user.id}`;
           logoutBtn.style.display = 'inline-block';
           userAvatar.removeEventListener('click', showLoginModal);
           userAvatar.addEventListener('click', showUserDetailsModal);
       } else {
           loginText.textContent = 'Login';
           logoutBtn.style.display = 'none';
           userAvatar.addEventListener('click', showLoginModal);
           userAvatar.removeEventListener('click', showUserDetailsModal);
       }
   }

   function showLoginModal() {
       document.getElementById('loginModal').style.display = 'flex';
   }

   function showUserDetailsModal() {
       const user = JSON.parse(localStorage.getItem('user'));
       if (user) {
           document.getElementById('user-id-display').value = user.id;
           document.getElementById('user-name').value = user.name;
           document.getElementById('user-major').value = user.major;
           document.getElementById('userDetailsModal').style.display = 'flex';
       }
   }

   // Initial check
   updateLoginStatus();
  // Event bindings
  sendBtn.addEventListener("click", sendMessage);
  messageInput.addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
  });
  clearBtn.addEventListener("click", clearChat);

  // Toolbar actions
  setTimeout(() => {
    document.querySelectorAll(".tool-item").forEach(el => {
      el.addEventListener("click", () => {
        appendMessage(`👉 You clicked: ${el.textContent}`, "bot");
      });
    });
  }, 100); // Lazy binding

  // Core send logic
  let promptCount = 0;
  let interactionLog = [];

  // 定义 logInteraction 函数
  function logInteraction(userId, startTime, endTime, responseTime, promptCountVal, userMessage, aiReply, errorMessage = null) {
    const start = new Date(startTime);
    const formattedStartTime = formatDateTime(start);

    let formattedEndTime = null;
    if (endTime) {
      const end = new Date(endTime);
      formattedEndTime = formatDateTime(end);
    }

    interactionLog.push({
      userId,
      startTime: formattedStartTime,
      endTime: formattedEndTime,
      responseTime: responseTime,
      promptCount: promptCountVal,
      userMessage: userMessage,
      aiReply: aiReply,
      errorMessage: errorMessage
    });
    console.log("Interaction Log:", interactionLog);
  }


  async function sendMessage() {
   const user = JSON.parse(localStorage.getItem('user'));
   if(!user){
     alert('请登录')
    return
   }
   const users = user;
   if(!users){
     alert('请登录')
    return
   }
    apiKeyInput.value = JSON.parse(users).api_key
    const startTime = new Date().getTime(); // 获取开始时间
    const text = messageInput.value.trim();
    if (!text) return;

    const apiKey = apiKeyInput.value.trim();
    console.log('apiKey', apiKey);
    if (!apiKey || !apiKey.startsWith("sk-")) {
      appendMessage("⚠️ Invalid API Key. Please enter a valid OpenAI key starting with sk-", "bot");
      return;
    }
    localStorage.setItem("apiKey", apiKey);

    appendMessage(text, "user");
    messageInput.value = "";
    sendBtn.disabled = true;
    messageInput.disabled = true;

    appendMessage("🤖 Generating answers...", "bot-loading");

    try {
      const res = await fetch("http://127.0.0.1:5001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          role: roleDef.value,
          temperature: parseFloat(tempSlider.value),
          message: text
        })
      });

      const endTime = new Date().getTime(); // 获取结束时间
      const responseTime = endTime - startTime; // 计算响应延迟

      removeLoading();

      if (!res.ok) {
        const errText = await res.text();
        appendMessage(`❌ Error ${res.status}: ${errText}`, "bot");
        logInteraction(user.id, startTime, null, responseTime, promptCount, text, null, `Error ${res.status}: ${errText}`);
        return;
      }

      const data = await res.json();
      appendMessage(data.reply, "bot");
      logInteraction(user.id, startTime, endTime, responseTime, ++promptCount, text, data.reply);

      // 提交日志到后端
      await fetch("http://127.0.0.1:5001/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs: interactionLog })
      });

      // 清空已提交的日志
      interactionLog = [];
    } catch (err) {
      const endTime = new Date().getTime(); // 获取结束时间（即使出错）
      removeLoading();
      appendMessage("🚨 Network error: " + err.message, "bot");
      logInteraction(user.id, startTime, endTime, null, promptCount, text, null, err.message);
    } finally {
      sendBtn.disabled = false;
      messageInput.disabled = false;
      messageInput.focus();
    }
  }
  function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从 0 开始
    const day = String(date.getDate()).padStart(2, '0');

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  function appendMessage(text, type) {
    const div = document.createElement("div");
    div.className = "message " + type;
    div.textContent = text;
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    messages.push({ text, type });
    localStorage.setItem("chatMessages", JSON.stringify(messages));
  }

  function removeLoading() {
    const loading = document.querySelector(".bot-loading");
    if (loading) loading.remove();
  }

  function clearChat() {
    localStorage.removeItem("chatMessages");
    messages = [];
    chatWindow.innerHTML = "";
  }
  document.getElementById('toggleKey').addEventListener('click', () => {
    const input = document.getElementById('apiKey');
    input.type = input.type === 'password' ? 'text' : 'password';
  });
  // API Key Update functionality
  async function updateApiKey() {
    const users = localStorage.getItem('user');
    if (!users) {
      alert('请先登录');
      return;
    }
    
    const user = JSON.parse(users);
    const newApiKey = apiKeyInput.value.trim();
    
    // Validate API key format
    if (!newApiKey || !newApiKey.startsWith("sk-")) {
      alert('Invalid API Key. Please enter a valid OpenAI key starting with sk-');
      return;
    }
    
    try {
      const res = await fetch("http://127.0.0.1:5001/update_api_key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          major: user.major,
          api_key: newApiKey
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        alert("Failed to update API key: " + (err.error || "Unknown error"));
        return;
      }
      
      const data = await res.json();
      
      // Update localStorage with new API key
      user.api_key = newApiKey;
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem("apiKey", newApiKey);
      
      alert('API Key updated successfully!');
      console.log('✅ API Key updated:', data.message);
      
    } catch (err) {
      console.error('❌ Update API Key error:', err);
      alert('Network error: ' + err.message);
    }
  }
  
  // Add event listener for API key update (if update button exists)
  const updateApiKeyBtn = document.getElementById('updateApiKeyBtn');
  if (updateApiKeyBtn) {
    updateApiKeyBtn.addEventListener('click', updateApiKey);
  }

  // User details modal functionality
  document.getElementById('updateUserBtn').addEventListener('click', async () => {
      const user = JSON.parse(localStorage.getItem('user'));
      const newName = document.getElementById('user-name').value;
      const newMajor = document.getElementById('user-major').value;

      if (!newName || !newMajor) {
          alert('Name and major cannot be empty.');
          return;
      }

      const res = await fetch("http://127.0.0.1:5001/update_user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: user.id, name: newName, major: newMajor })
      });

      if (!res.ok) {
          const err = await res.json();
          alert("Update failed: " + (err.error || "Unknown error"));
          return;
      }

      const data = await res.json();
      user.name = newName;
      user.major = newMajor;
      localStorage.setItem('user', JSON.stringify(user));
      alert('User details updated successfully!');
      document.getElementById('userDetailsModal').style.display = 'none';
  });

  document.getElementById('logoutFromDetailsBtn').addEventListener('click', () => {
      logout();
      document.getElementById('userDetailsModal').style.display = 'none';
  });

  document.getElementById('closeUserDetailsModal').addEventListener('click', () => {
      document.getElementById('userDetailsModal').style.display = 'none';
  });

  // Registration functionality
  document.getElementById('showRegisterModal').addEventListener('click', () => {
      document.getElementById('loginModal').style.display = 'none';
      document.getElementById('registerModal').style.display = 'flex';
  });

  document.getElementById('closeRegisterModal').addEventListener('click', () => {
      document.getElementById('registerModal').style.display = 'none';
  });

  document.getElementById('registerBtn').addEventListener('click', async () => {
      const name = document.getElementById('reg-name').value;
      const id = document.getElementById('reg-id').value;
      const major = document.getElementById('reg-major').value;

      if (!name || !id || !major) {
          alert('Please fill in all registration fields.');
          return;
      }

      const res = await fetch("http://127.0.0.1:5001/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, id, major })
      });

      if (!res.ok) {
          const err = await res.json();
          alert("Registration failed: " + (err.error || "Unknown error"));
          return;
      }

      alert('Registration successful! Please log in.');
      document.getElementById('registerModal').style.display = 'none';
      showLoginModal();
  });
  
  // Alternative: Listen for Enter key in API key input field
  apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) { // Ctrl+Enter to update API key
      updateApiKey();
    }
  });

});



