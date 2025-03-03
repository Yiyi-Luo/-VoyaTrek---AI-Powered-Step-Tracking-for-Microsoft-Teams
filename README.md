# VoyaTrek: AI-Powered Step Tracking for Microsoft Teams
#### Authors: Dan Hales & Yiyi Luo
**VoyaTrek** is a Microsoft Teams plugin developed to support the company's summer walkathon initiative. The application allows employees to easily log their daily step counts directly within Microsoft Teams, view their personal statistics, and participate in friendly competition through a leaderboard system.

***This project*** was developed as a response to the "Request for Proposals on Generative AI Pilots" initiative. VoyaTrek demonstrates the capabilities of generative AI in creating real-world applications with minimal human intervention:

- The project began with a single human prompt describing the desired functionality, all subsequent development was guided by Claude's instructions; 100% of the code and implementation scripts were generated by Claude AI
- Humans provided feedback by sharing error messages and testing results, Claude AI generated solutions to all technical challenges encountered
- The documentation, workflow diagrams, and feature summaries were also created with Claude's assistance

**The Original Prompt That Started It All**:

> *We want to use gen AI to create a full-stack plugin for Microsoft Teams that allows everyone to log their daily step count via messages in the chat window. We propose the following syntax: '@voyatrek 10000 steps yesterday'. The plugin should detect this message, parse '10000', create a valid date for 'yesterday', and make an entry (username, 10000, '2025-02-28') in a Postgres instance on Azure. We should use AI to generate both a secure application meeting this spec and full configuration/setup instructions, then get the plugin approved for use by the whole company to submit steps for the summer walkathon.*

From this single prompt, Claude AI guided the entire development process, from environment setup to database configuration to user interface design, culminating in the fully functional application documented in this presentation.tion.

# VoyaTrek Workflow

### The diagram below illustrates how information flows through the VoyaTrek application:

<center>
<img src="Voyatrek WF.png" width="450">
<br>
<em>VoyaTrek workflow showing the complete process from user input to visualization</em>
</center>
# Application Interface

### The VoyaTrek application features a color-coded interface with distinct visual themes for each function:

<center>
<img src="Main Menu Card.png" width="450">
<br>
<em>Fig 1. Main Menu (Blue) - Central navigation hub providing access to all features</em>
</center>

---

<center>
<img src="Stats Card.png" width="450">
<br>
<em>Fig 2. Statistics View (Green) - Personal progress tracking with step totals and streaks</em>
</center>

---

<center>
<img src="Leaderboard Card.png" width="450">
<br>
<em>Fig 3. Leaderboard (Gold) - Company-wide competition with medals for top performers</em>
</center>

---

<center>
<img src="Log Steps Card.png" width="450">
<br>
<em>Fig 4. Step Logging (Orange) - Interface for recording daily step counts</em>
</center>
