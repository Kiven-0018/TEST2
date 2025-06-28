// ✅ Optimized chatbot.js - Clean, high-performance version
console.log("✅ chatbot.js loaded");

let messages = [];

window.addEventListener("DOMContentLoaded", () => {
  const chatWindow = document.getElementById("chat-window");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const clearBtn = document.getElementById("clearBtn");
  const roleDef = document.getElementById("roleDef");
  const tempSlider = document.getElementById("temperature");
  const tempValue = document.getElementById("tempValue");
  const studentIdInput = document.getElementById("your-ID-number");
  const majorInput = document.getElementById("your-major");
  const loginBtn = document.getElementById("loginBtn");
  const newChatBtn = document.getElementById("newChatBtn");

  // Temperature display
  tempValue.textContent = tempSlider.value;
  tempSlider.addEventListener("input", () => {
    tempValue.textContent = tempSlider.value;
  });

  // Login event
  loginBtn.addEventListener("click", login);
  document.getElementById("logoutBtn").addEventListener("click", logout);

  async function login() {
    const student_id = studentIdInput.value;
    const major = majorInput.value;

    if (!student_id) {
      return alert("请输入账号");
    }
    if (!major) {
      return alert("请输入密码");
    }

    const res = await fetch("http://127.0.0.1:5001/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id, major }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert("账号或密码不正确");
      return;
    }

    const data = await res.json();
    document.getElementById("loginModal").style.display = "none";
    alert("登录成功");
    localStorage.setItem("user", JSON.stringify(data.user));
    updateLoginStatus();
    loadChatHistory();
  }

  function logout() {
    localStorage.removeItem("user");
    updateLoginStatus();
    clearChat();
    alert("You have been logged out.");
  }

  async function updateLoginStatus() {
    const user = JSON.parse(localStorage.getItem("user"));
    const sidebarUserInfo = document.getElementById("sidebarUserInfo");
    const logoutBtn = document.getElementById("logoutBtn");
    const userAvatar = document.getElementById("userAvatar");

    if (user) {
      // Display user info from local storage
      const learningStyle = user.learning_style || "Unknown";
      const userInfoHTML = `
        <div><strong>User ID:</strong> ${user.student_id}</div>
        <div><strong>Learning Style:</strong> <span class="learning-style">${learningStyle}</span></div>
      `;
      sidebarUserInfo.innerHTML = userInfoHTML;
      sidebarUserInfo.style.display = "block";
      logoutBtn.style.display = "inline-block";
      userAvatar.removeEventListener("click", showLoginModal);
      userAvatar.addEventListener("click", showUserDetailsModal);
    } else {
      if (sidebarUserInfo) {
        sidebarUserInfo.innerHTML = "";
        sidebarUserInfo.style.display = "none";
      }
      logoutBtn.style.display = "none";
      userAvatar.addEventListener("click", showLoginModal);
      userAvatar.removeEventListener("click", showUserDetailsModal);
    }
  }

  function showLoginModal() {
    document.getElementById("loginModal").style.display = "flex";
  }

  function showUserDetailsModal() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      document.getElementById("user-id-display").value = user.student_id;
      document.getElementById("user-name").value = user.name;
      document.getElementById("user-major").value = user.major;
      document.getElementById("userDetailsModal").style.display = "flex";
    }
  }

  // Initial check
  updateLoginStatus();
  loadChatHistory();

  // Event bindings
  sendBtn.addEventListener("click", sendMessage);
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });
  clearBtn.addEventListener("click", clearChat);
  newChatBtn.addEventListener("click", newChat);

  // Toolbar actions
  setTimeout(() => {
    document.querySelectorAll(".tool-item").forEach((el) => {
      el.addEventListener("click", () => {
        appendMessage(`👉 You clicked: ${el.textContent}`, "bot");
      });
    });
  }, 100); // Lazy binding

  // Core send logic
  let promptCount = 0;
  let interactionLog = [];

  // 定义 logInteraction 函数
  function logInteraction(
    userId,
    startTime,
    endTime,
    responseTime,
    promptCountVal,
    userMessage,
    aiReply,
    errorMessage = null
  ) {
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
      errorMessage: errorMessage,
    });
    console.log("Interaction Log:", interactionLog);
  }

  async function sendMessage() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      alert("请登录");
      return;
    }

    const startTime = new Date().getTime(); // 获取开始时间
    const text = messageInput.value.trim();
    if (!text) return;

    appendMessage(text, "user");
    messageInput.value = "";
    sendBtn.disabled = true;
    messageInput.disabled = true;

    appendMessage("🤖 Generating answers...", "bot-loading");

    try {
      const payload = {
        role: roleDef.value,
        temperature: parseFloat(tempSlider.value),
        message: text,
        userId: user.student_id,
      };
      console.log("Sending payload to /chat:", JSON.stringify(payload, null, 2));

      const res = await fetch("http://127.0.0.1:5001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const endTime = new Date().getTime(); // 获取结束时间
      const responseTime = endTime - startTime; // 计算响应延迟

      removeLoading();

      if (!res.ok) {
        const errText = await res.text();
        appendMessage(`❌ Error ${res.status}: ${errText}`, "bot");
        logInteraction(
          user.student_id,
          startTime,
          null,
          responseTime,
          promptCount,
          text,
          null,
          `Error ${res.status}: ${errText}`
        );
        return;
      }

      const data = await res.json();
      appendMessage(data.reply, "bot");
      logInteraction(
        user.student_id,
        startTime,
        endTime,
        responseTime,
        ++promptCount,
        text,
        data.reply
      );

      // 提交日志到后端
      await fetch("http://127.0.0.1:5001/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs: interactionLog }),
      });

      // 清空已提交的日志
      interactionLog = [];
    } catch (err) {
      const endTime = new Date().getTime(); // 获取结束时间（即使出错）
      removeLoading();
      appendMessage("🚨 Network error: " + err.message, "bot");
      logInteraction(
        user.student_id,
        startTime,
        endTime,
        null,
        promptCount,
        text,
        null,
        err.message
      );
    } finally {
      sendBtn.disabled = false;
      messageInput.disabled = false;
      messageInput.focus();
    }
  }
  function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // 月份从 0 开始
    const day = String(date.getDate()).padStart(2, "0");

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  function appendMessage(text, type) {
    const div = document.createElement("div");
    div.className = "message " + type;
    if (type === "bot" || type === "assistant") {
      div.innerHTML = marked.parse(text);
    } else {
      div.textContent = text;
    }
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    if (type !== 'system') {
        messages.push({ role: type, content: text });
        localStorage.setItem("chatMessages", JSON.stringify(messages));
    }
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

  function newChat() {
      clearChat();
      appendMessage("Starting a new chat...", "system")
  }

  async function loadChatHistory() {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) return;

      const res = await fetch(`http://127.0.0.1:5001/history?userId=${user.student_id}`);
      if (res.ok) {
          const history = await res.json();
          messages = history;
          chatWindow.innerHTML = '';
          messages.forEach(msg => appendMessage(msg.content, msg.role));
      }
  }


  // User details modal functionality
  document
    .getElementById("updateUserBtn")
    .addEventListener("click", async () => {
      const user = JSON.parse(localStorage.getItem("user"));
      const newName = document.getElementById("user-name").value;
      const newMajor = document.getElementById("user-major").value;

      if (!newName || !newMajor) {
        alert("Name and major cannot be empty.");
        return;
      }

      const res = await fetch("http://127.0.0.1:5001/update_user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: user.student_id,
          name: newName,
          major: newMajor,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert("Update failed: " + (err.error || "Unknown error"));
        return;
      }

      const data = await res.json();
      user.name = newName;
      user.major = newMajor;
      localStorage.setItem("user", JSON.stringify(user));
      alert("User details updated successfully!");
      document.getElementById("userDetailsModal").style.display = "none";
    });

  document
    .getElementById("logoutFromDetailsBtn")
    .addEventListener("click", () => {
      logout();
      document.getElementById("userDetailsModal").style.display = "none";
    });

  document
    .getElementById("closeUserDetailsModal")
    .addEventListener("click", () => {
      document.getElementById("userDetailsModal").style.display = "none";
    });

  // Registration functionality
  document
    .getElementById("showRegisterModal")
    .addEventListener("click", () => {
      document.getElementById("loginModal").style.display = "none";
      document.getElementById("registerModal").style.display = "flex";
    });

  document
    .getElementById("closeRegisterModal")
    .addEventListener("click", () => {
      document.getElementById("registerModal").style.display = "none";
    });

  document.getElementById("registerBtn").addEventListener("click", async () => {
    const name = document.getElementById("reg-name").value;
    const student_id = document.getElementById("reg-id").value;
    const major = document.getElementById("reg-major").value;

    if (!name || !student_id || !major) {
      alert("Please fill in all required registration fields.");
      return;
    }

    const res = await fetch("http://127.0.0.1:5001/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, student_id, major }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert("Registration failed: " + (err.error || "Unknown error"));
      return;
    }

    alert("Registration successful! Please log in.");
    document.getElementById("registerModal").style.display = "none";
    showLoginModal();
  });

});
