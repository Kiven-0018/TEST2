### **Product Requirements Document (PRD): Adaptive Tutoring Chatbot (PoC)**

**Version:** 0.1
**Author:** AI Assistant (for YANG QIHE)
**Status:** In Development
**Target:** Master's Project Proof of Concept

#### **1. Introduction & Vision**

This document outlines the requirements for a proof-of-concept (PoC) of an adaptive tutoring chatbot. The vision is to create a chatbot that leverages a Large Language Model (GPT-4) to deliver personalized explanations tailored to a user's specific learning style, as defined by the VARK model.

For this PoC, we will focus exclusively on a single subject and topic: **Solving basic linear equations in Algebra.**

#### **2. Problem & Goal**

*   **Problem:** Generic chatbots provide one-size-fits-all explanations. Students may benefit from content presented in a style that aligns with their preferred way of learning.
*   **Goal:** To build and test the core "Adaptive Prompt Generation" module. This module will dynamically construct prompts for the LLM based on both the student's question and their pre-determined VARK learning style.

#### **3. User Profiles & Personas**

For this PoC, we will consider four primary user personas based on the VARK model. The system must cater to each.

*   **Vicky (Visual):** Learns best from diagrams, charts, and spatial representations. Needs to "see" the problem.
*   **Andy (Auditory):** Learns best from listening and talking. Responds to conversational tone and step-by-step narration.
*   **Rachel (Read/Write):** Learns best from text. Wants clear definitions, structured lists, and detailed written procedures.
*   **Kevin (Kinesthetic):** Learns best by doing. Needs hands-on examples, real-world analogies, and actionable steps.

#### **4. Core Feature: Adaptive Prompt Generation Module**

This is the central feature of the PoC.

##### **4.1. Functional Requirements**

*   **FR1: Input Handling:** The module must accept two string inputs:
    1.  `user_query`: The specific math problem or question from the user (e.g., "how to solve 2x - 5 = 11").
    2.  `user_style`: The user's dominant VARK learning style (e.g., "Visual", "Auditory", "Read/Write", "Kinesthetic").

*   **FR2: Prompt Template Library:** The system must contain a library of pre-defined "meta-prompt" templates, with at least one template for each of the four VARK styles.
    *   Each template will be a set of instructions for the LLM, guiding it on *how* to explain the concept.
    *   Each template must contain a placeholder (e.g., `{user_query}`) to insert the user's specific question.

*   **FR3: Dynamic Prompt Construction:** The module must perform the following logic:
    1.  Select the appropriate prompt template from the library based on the `user_style` input.
    2.  If the `user_style` is invalid or not found, it must default to a safe, generic style (e.g., "Read/Write").
    3.  Insert the `user_query` into the selected template.
    4.  Return the final, fully-formatted prompt string.

*   **FR4: Output:** The module's sole output will be the final prompt string, ready to be sent to the LLM API.

##### **4.2. Implementation Details (The "How-To")**

**Step 1: Define the Teaching Strategies for Algebra per VARK Style.**
This is a design task. We must define the specific instructional tactics for each style.
*   **Visual:** Use the **balancing scale analogy**. Emphasize visual cues, formatting, and suggest drawing.
*   **Auditory:** Use a **conversational, Socratic dialogue** style. Use rhetorical questions and narrative flow.
*   **Read/Write:** Use a **formal, textbook procedure**. Provide numbered steps, definitions, and rules.
*   **Kinesthetic:** Use a **real-world, hands-on analogy** (e.g., money, items). Emphasize action verbs and "doing."

**Step 2: Create the Python Prompt Template Library.**
Implement the strategies from Step 1 as a Python dictionary.
*   **File:** `prompt_templates.py`
*   **Structure:** A dictionary where keys are the VARK styles (`"Visual"`, etc.) and values are the detailed f-string templates. (See previous response for the code).

**Step 3: Build the Generator Function.**
Implement the logic from FR3.
*   **File:** `adaptive_generator.py`
*   **Function:** `generate_adaptive_prompt(user_query, user_style)`
*   **Logic:** Use `dictionary.get(key, default)` for safe template retrieval and `.format()` to insert the query.

**Step 4: Create a Simple Test Harness.**
Create a small script to test the module independently before integrating it into the full chatbot.
*   **File:** `test_generator.py`
*   **Functionality:**
    1.  Define a sample `query`.
    2.  Loop through a list of all VARK styles (`["Visual", "Auditory", "Read/Write", "Kinesthetic"]`).
    3.  For each style, call the `generate_adaptive_prompt` function.
    4.  Print the resulting prompt to the console to manually verify it's correct.

---

### **5. Multimodal Generation: Descriptions and Challenges**

You're right to identify this as a core challenge. VARK theory *implies* the need for different media (images, audio, etc.), but your friend is building a **text-based chatbot**. This creates a fundamental constraint. We can simulate these styles with text, but we can't truly generate different media with a standard text-in, text-out LLM like the base GPT-4 API.

Here’s a breakdown of the challenges and potential workarounds:

| VARK Style | Ideal Multimodal Output | Text-Based Simulation Challenge | Workaround / Solution for PoC | LLM to Consider for "Real" Output |
| :--- | :--- | :--- | :--- | :--- |
| **Visual (V)** | **Generated Images, Diagrams, Charts** | A text model can't create an image. It can only *describe* an image or use text-based visual aids. | **1. Describe the Diagram:** Instruct the LLM to describe what a diagram of the balancing scale would look like. <br> **2. Use Emojis & ASCII Art:** A simpler, but often effective, way to add visual elements. `⚖️` <br> **3. Markdown Formatting:** Use `**bold**`, `*italics*`, and code blocks to structure the text visually. | **DALL-E 3, Midjourney** (Image Generation Models). An advanced system would have the LLM generate a prompt for DALL-E to create an actual diagram. |
| **Auditory (A)** | **Generated Audio (Text-to-Speech)** | Text is inherently silent. The challenge is to write text that *feels* like it's being spoken. | **1. Conversational Style:** The primary workaround. Use rhetorical questions, informal language, and a narrative tone. <br> **2. Suggest Reading Aloud:** The prompt can literally tell the user, "Try reading this next part out loud to yourself." | **ElevenLabs, OpenAI's TTS API.** The LLM's text output would be piped to a Text-to-Speech service to generate an audio file. |
| **Read/Write (R)** | **Well-formatted Text** | This is the native strength of an LLM. The challenge is ensuring the structure is a perfect fit, not just a wall of text. | **1. Strict Formatting Instructions:** The prompt must be very explicit about using numbered lists, definitions, and formal language. <br> **2. Markdown Mastery:** Use Markdown for lists, tables, and headers to create a document-like structure. | **GPT-4** is already excellent at this. No other model is strictly necessary. |
| **Kinesthetic (K)**| **Interactive Simulation, Physical Task** | This is the hardest to simulate in a passive text environment. The chatbot can't make the user *do* anything. | **1. Action-Oriented Language:** Use strong verbs and frame steps as physical actions ("*take away*", "*group together*"). <br> **2. Real-World Analogies:** Connect the abstract math to a physical scenario (money, baking). <br> **3. "Homework" Suggestion:** Prompt the user to "go get 10 coins and try this out yourself." | This is beyond current LLMs. It would require an **Interactive Learning Environment** (like a JavaScript-based virtual manipulative) that the LLM could control via function calling. |

**Summary**

For the Master's project PoC, **stick to the text-based workarounds**. The goal isn't to build a full multimodal system. It's to prove that you can guide a text LLM to *simulate* these different teaching styles effectively. He should explicitly state this limitation and the chosen workarounds in his methodology. Trying to integrate DALL-E or a TTS API at this stage would be a massive distraction and is not necessary to prove the core concept of his research. The "Adaptive Prompt Generator" is the main event.