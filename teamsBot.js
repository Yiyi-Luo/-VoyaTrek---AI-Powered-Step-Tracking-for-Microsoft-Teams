// Import required dependencies
const { TeamsActivityHandler, TurnContext, CardFactory } = require("botbuilder");
const { Client } = require('pg');
require('dotenv').config();

// Database connection
const getDbClient = () => {
  return new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });
};

class VoyaTrekBot extends TeamsActivityHandler {
  constructor() {
    super();
    
    // Handle message activity
    this.onMessage(async (context, next) => {
      // Safety check to ensure context.activity exists
      if (!context.activity) {
        console.error("Activity is undefined");
        await next();
        return;
      }

      // Check for card action
      if (context.activity.value) {
        // This is a card action
        await this.handleCardAction(context);
        await next();
        return;
      }

      // Safety check for text
      const text = context.activity.text ? context.activity.text.trim() : "";
      // Safety check for sender name
      const sender = context.activity.from && context.activity.from.name 
        ? context.activity.from.name 
        : "User";
      
      // Regex patterns for different commands
      // Format: @voyatrek 10000 steps yesterday
      const stepRegex = /@voyatrek\s+(\d+)\s+steps\s+(yesterday|today|[\d-]+)/i;
      // Format: @voyatrek stats
      const statsRegex = /@voyatrek\s+stats/i;
      // Format: @voyatrek leaderboard
      const leaderboardRegex = /@voyatrek\s+leaderboard/i;
      // Format: @voyatrek log - for showing step log form
      const logStepsRegex = /@voyatrek\s+log/i;
      
      const stepMatch = text.match(stepRegex);
      const statsMatch = text.match(statsRegex);
      const leaderboardMatch = text.match(leaderboardRegex);
      const logStepsMatch = text.match(logStepsRegex);
      
      if (stepMatch) {
        const stepCount = parseInt(stepMatch[1], 10);
        const dateText = stepMatch[2].toLowerCase();
        
        // Parse the date
        let logDate = new Date();
        
        if (dateText === 'yesterday') {
          logDate.setDate(logDate.getDate() - 1);
        } else if (dateText === 'today') {
          // Already set to today
        } else {
          // Try to parse a specific date
          try {
            logDate = new Date(dateText);
          } catch (e) {
            await context.sendActivity("Sorry, I couldn't understand that date. Please try again with 'yesterday', 'today', or a specific date (YYYY-MM-DD).");
            await next();
            return;
          }
        }
        
        // Format the date as YYYY-MM-DD
        const formattedDate = logDate.toISOString().split('T')[0];
        
        // Log the steps to the database
        try {
          await this.logSteps(sender, stepCount, formattedDate);
          await context.sendActivity(`Thanks, ${sender}! I've logged ${stepCount} steps for ${formattedDate}.`);
        } catch (error) {
          console.error("Error logging steps:", error);
          await context.sendActivity("Sorry, I couldn't log your steps right now. Please try again later.");
        }
      } else if (statsMatch) {
        // Handle stats command
        try {
          const stats = await this.getUserStats(sender);
          if (stats) {
            const message = this.createStatsCard(sender, stats);
            await context.sendActivity(message);
          } else {
            await context.sendActivity(`No step data found for you yet, ${sender}. Start logging your steps with "@voyatrek [number] steps [date]".`);
          }
        } catch (error) {
          console.error("Error fetching user stats:", error);
          await context.sendActivity("Sorry, I couldn't retrieve your stats right now. Please try again later.");
        }
      } else if (leaderboardMatch) {
        // Handle leaderboard command
        try {
          const leaderboard = await this.getLeaderboard(10);
          if (leaderboard && leaderboard.length > 0) {
            const message = this.createLeaderboardCard(leaderboard);
            await context.sendActivity(message);
          } else {
            await context.sendActivity("No step data has been logged yet. Start tracking steps to appear on the leaderboard!");
          }
        } catch (error) {
          console.error("Error fetching leaderboard:", error);
          await context.sendActivity("Sorry, I couldn't retrieve the leaderboard right now. Please try again later.");
        }
      } else if (logStepsMatch) {
        // Show step log form
        await context.sendActivity(this.createStepLogCard());
      } else if (text.toLowerCase().includes('@voyatrek') || text.toLowerCase() === 'help') {
        // Show the main menu/help card
        await context.sendActivity(this.createMainMenuCard());
      }
      
      await next();
    });
  }
  
  // Handle card action
  async handleCardAction(context) {
    // Safety check for sender name
    const sender = context.activity.from && context.activity.from.name 
      ? context.activity.from.name 
      : "User";
    
    // Get the action data from the activity
    const value = context.activity.value;
    
    if (!value || !value.action) {
      return;
    }
    
    const action = value.action;
    
    switch (action) {
      case 'logSteps':
        await context.sendActivity(this.createStepLogCard());
        break;
        
      case 'todaySteps':
        try {
          const today = new Date().toISOString().split('T')[0];
          await this.logSteps(sender, 8000, today);
          await context.sendActivity(`Thanks, ${sender}! I've logged 8,000 steps for today (${today}).`);
        } catch (error) {
          console.error("Error logging steps:", error);
          await context.sendActivity("Sorry, I couldn't log your steps right now. Please try again later.");
        }
        break;
        
      case 'yesterdaySteps':
        try {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          await this.logSteps(sender, 10000, yesterdayStr);
          await context.sendActivity(`Thanks, ${sender}! I've logged 10,000 steps for yesterday (${yesterdayStr}).`);
        } catch (error) {
          console.error("Error logging steps:", error);
          await context.sendActivity("Sorry, I couldn't log your steps right now. Please try again later.");
        }
        break;
        
      case 'viewStats':
        try {
          const stats = await this.getUserStats(sender);
          if (stats) {
            await context.sendActivity(this.createStatsCard(sender, stats));
          } else {
            await context.sendActivity(`No step data found for you yet, ${sender}. Start logging your steps with "@voyatrek [number] steps [date]".`);
          }
        } catch (error) {
          console.error("Error fetching user stats:", error);
          await context.sendActivity("Sorry, I couldn't retrieve your stats right now. Please try again later.");
        }
        break;
        
      case 'viewLeaderboard':
        try {
          const leaderboard = await this.getLeaderboard(10);
          if (leaderboard && leaderboard.length > 0) {
            await context.sendActivity(this.createLeaderboardCard(leaderboard));
          } else {
            await context.sendActivity("No step data has been logged yet. Start tracking steps to appear on the leaderboard!");
          }
        } catch (error) {
          console.error("Error fetching leaderboard:", error);
          await context.sendActivity("Sorry, I couldn't retrieve the leaderboard right now. Please try again later.");
        }
        break;
        
      default:
        await context.sendActivity(`I'm not sure what to do with that action.`);
    }
  }
  
  // Method to log steps to the database
  async logSteps(username, stepCount, logDate) {
    const client = getDbClient();
    
    try {
      await client.connect();
      
      const query = {
        text: 'INSERT INTO step_logs(username, step_count, log_date) VALUES($1, $2, $3) RETURNING id',
        values: [username, stepCount, logDate],
      };
      
      const result = await client.query(query);
      await client.end();
      
      return result.rows[0].id;
    } catch (error) {
      await client.end();
      throw error;
    }
  }
  
  // Method to get user stats
  async getUserStats(username) {
    const client = getDbClient();
    
    try {
      await client.connect();
      
      // Get overall stats
      const overallQuery = {
        text: `
          SELECT 
            SUM(step_count) as total_steps,
            AVG(step_count) as avg_steps,
            COUNT(*) as days_logged,
            MAX(step_count) as best_day,
            MIN(log_date) as first_log,
            MAX(log_date) as last_log
          FROM step_logs
          WHERE username = $1
        `,
        values: [username],
      };
      
      const overallResult = await client.query(overallQuery);
      
      // If no data found
      if (!overallResult.rows[0].total_steps) {
        await client.end();
        return null;
      }
      
      // Get streak info (consecutive days)
      const streakQuery = {
        text: `
          WITH consecutive_days AS (
            SELECT 
              log_date, 
              lag(log_date, 1) OVER (ORDER BY log_date) as prev_date
            FROM (
              SELECT DISTINCT log_date
              FROM step_logs
              WHERE username = $1
              ORDER BY log_date
            ) distinct_dates
          ),
          streaks AS (
            SELECT 
              log_date,
              CASE 
                WHEN log_date - prev_date = INTERVAL '1 day' THEN 0
                ELSE 1
              END as new_streak
            FROM consecutive_days
          ),
          streak_groups AS (
            SELECT
              log_date,
              SUM(new_streak) OVER (ORDER BY log_date) as streak_group
            FROM streaks
          )
          SELECT
            streak_group,
            COUNT(*) as streak_length,
            MIN(log_date) as streak_start,
            MAX(log_date) as streak_end
          FROM streak_groups
          GROUP BY streak_group
          ORDER BY streak_end DESC
          LIMIT 1
        `,
        values: [username],
      };
      
      // Try to get streak info, but don't fail if it doesn't work
      let streakResult = { rows: [{ streak_length: 0 }] };
      try {
        streakResult = await client.query(streakQuery);
      } catch (e) {
        console.error("Error calculating streak:", e);
      }
      
      // Combine the results
      const stats = {
        ...overallResult.rows[0],
        current_streak: streakResult.rows[0]?.streak_length || 0
      };
      
      await client.end();
      return stats;
    } catch (error) {
      await client.end();
      throw error;
    }
  }
  
  // Method to get leaderboard
  async getLeaderboard(limit = 10) {
    const client = getDbClient();
    
    try {
      await client.connect();
      
      const query = {
        text: `
          SELECT 
            username,
            SUM(step_count) as total_steps,
            COUNT(DISTINCT log_date) as days_logged,
            MAX(log_date) as last_log
          FROM step_logs
          GROUP BY username
          ORDER BY total_steps DESC
          LIMIT $1
        `,
        values: [limit],
      };
      
      const result = await client.query(query);
      await client.end();
      
      return result.rows;
    } catch (error) {
      await client.end();
      throw error;
    }
  }
  
  // Create a card for displaying user stats with light green theme
  createStatsCard(username, stats) {
    // Format the numbers
    const totalSteps = parseInt(stats.total_steps).toLocaleString();
    const avgSteps = Math.round(parseFloat(stats.avg_steps)).toLocaleString();
    const bestDay = parseInt(stats.best_day).toLocaleString();
    
    // Format dates
    const firstLog = new Date(stats.first_log).toLocaleDateString();
    const lastLog = new Date(stats.last_log).toLocaleDateString();
    
    const card = CardFactory.adaptiveCard({
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.3",
      "body": [
        {
          "type": "Container",
          "style": "emphasis",
          "bleed": true,
          "backgroundImage": {
            "url": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM5MEVFOTAiIHN0b3Atb3BhY2l0eT0iMC44Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMzJDRDMyIiBzdG9wLW9wYWNpdHk9IjAuOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiLz48L3N2Zz4="
          },
          "items": [
            {
              "type": "TextBlock",
              "size": "Large",
              "weight": "Bolder",
              "text": `${username}'s Step Stats`,
              "color": "light",
              "horizontalAlignment": "center"
            }
          ]
        },
        {
          "type": "Container",
          "style": "default",
          "items": [
            {
              "type": "FactSet",
              "facts": [
                {
                  "title": "Total Steps:",
                  "value": totalSteps
                },
                {
                  "title": "Days Logged:",
                  "value": stats.days_logged
                },
                {
                  "title": "Average Steps/Day:",
                  "value": avgSteps
                },
                {
                  "title": "Best Day:",
                  "value": bestDay
                },
                {
                  "title": "Current Streak:",
                  "value": `${stats.current_streak} day${stats.current_streak !== 1 ? 's' : ''}`
                },
                {
                  "title": "First Log:",
                  "value": firstLog
                },
                {
                  "title": "Latest Log:",
                  "value": lastLog
                }
              ]
            }
          ]
        }
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "Log Steps",
          "data": {
            "action": "logSteps"
          }
        },
        {
          "type": "Action.Submit",
          "title": "View Leaderboard",
          "data": {
            "action": "viewLeaderboard"
          }
        }
      ]
    });
    
    return { attachments: [card] };
  }
  
  // Create a card for displaying the leaderboard with gold theme and medal indicators
  createLeaderboardCard(leaderboardData) {
    // Create items for the leaderboard
    const items = leaderboardData.map((entry, index) => {
      const lastLog = new Date(entry.last_log).toLocaleDateString();
      let style = "default";
      let textColor = "default";
      
      if (index === 0) {
        style = "warning"; // Gold for 1st place
        textColor = "warning";
      } else if (index === 1) {
        style = "accent"; // Silver for 2nd place
        textColor = "accent";
      } else if (index === 2) {
        style = "good"; // Bronze for 3rd place
        textColor = "attention";
      }
      
      return {
        "type": "Container",
        "style": index < 3 ? style : "default",
        "items": [
          {
            "type": "ColumnSet",
            "columns": [
              {
                "type": "Column",
                "width": "auto",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": index === 0 ? "🥇" : (index === 1 ? "🥈" : (index === 2 ? "🥉" : `${index + 1}.`)),
                    "weight": index < 3 ? "Bolder" : "Default"
                  }
                ]
              },
              {
                "type": "Column",
                "width": "stretch",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": entry.username,
                    "weight": index < 3 ? "Bolder" : "Default"
                  }
                ]
              },
              {
                "type": "Column",
                "width": "auto",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": parseInt(entry.total_steps).toLocaleString(),
                    "weight": index < 3 ? "Bolder" : "Default"
                  }
                ]
              },
              {
                "type": "Column",
                "width": "auto",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": `(${entry.days_logged} days)`,
                    "size": "Small",
                    "isSubtle": true
                  }
                ]
              }
            ]
          }
        ]
      };
    });
    
    const card = CardFactory.adaptiveCard({
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.3",
      "body": [
        {
          "type": "Container",
          "style": "emphasis",
          "bleed": true,
          "backgroundImage": {
            "url": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNGRkQ3MDAiIHN0b3Atb3BhY2l0eT0iMC44Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjRkZBNTAwIiBzdG9wLW9wYWNpdHk9IjAuOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiLz48L3N2Zz4="
          },
          "items": [
            {
              "type": "TextBlock",
              "size": "Large",
              "weight": "Bolder",
              "text": "🏆 VoyaTrek Step Leaderboard 🏆",
              "horizontalAlignment": "center",
              "color": "light"
            }
          ]
        },
        {
          "type": "Container",
          "items": [
            {
              "type": "ColumnSet",
              "columns": [
                {
                  "type": "Column",
                  "width": "auto",
                  "items": [
                    {
                      "type": "TextBlock",
                      "text": "Rank",
                      "weight": "Bolder"
                    }
                  ]
                },
                {
                  "type": "Column",
                  "width": "stretch",
                  "items": [
                    {
                      "type": "TextBlock",
                      "text": "Name",
                      "weight": "Bolder"
                    }
                  ]
                },
                {
                  "type": "Column",
                  "width": "auto",
                  "items": [
                    {
                      "type": "TextBlock",
                      "text": "Steps",
                      "weight": "Bolder"
                    }
                  ]
                },
                {
                  "type": "Column",
                  "width": "auto",
                  "items": [
                    {
                      "type": "TextBlock",
                      "text": "Days",
                      "weight": "Bolder"
                    }
                  ]
                }
              ]
            }
          ]
        },
        ...items,
        {
          "type": "TextBlock",
          "text": "Updated as of " + new Date().toLocaleDateString(),
          "size": "Small",
          "isSubtle": true
        }
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "View My Stats",
          "data": {
            "action": "viewStats"
          }
        },
        {
          "type": "Action.Submit",
          "title": "Log Steps",
          "data": {
            "action": "logSteps"
          }
        }
      ]
    });
    
    return { attachments: [card] };
  }
  
// Create a main menu card with light blue theme, equal column heights, and fixed button widths
createMainMenuCard() {
  const card = CardFactory.adaptiveCard({
    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
    "type": "AdaptiveCard",
    "version": "1.3",
    "style": "default",
    "body": [
      {
        "type": "Container",
        "style": "emphasis",
        "bleed": true,
        "backgroundImage": {
          "url": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM4N0NFRUIiIHN0b3Atb3BhY2l0eT0iMC44Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMUU5MEZGIiBzdG9wLW9wYWNpdHk9IjAuOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiLz48L3N2Zz4="
        },
        "items": [
          {
            "type": "TextBlock",
            "size": "Large",
            "weight": "Bolder",
            "text": "🏃‍♂️ VoyaTrek Step Tracker 🏃‍♀️",
            "horizontalAlignment": "center",
            "color": "light",
            "spacing": "Medium"
          }
        ]
      },
      {
        "type": "Container",
        "items": [
          {
            "type": "TextBlock",
            "text": "Welcome to the company walkathon tracker! Log your daily steps and compete with colleagues.",
            "wrap": true,
            "spacing": "Medium"
          }
        ]
      },
      {
        "type": "ColumnSet",
        "columns": [
          {
            "type": "Column",
            "width": "stretch",
            "items": [
              {
                "type": "Container",
                "style": "emphasis",
                "height": "stretch",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "📝 Log Steps",
                    "horizontalAlignment": "center",
                    "weight": "Bolder",
                    "color": "warning"
                  },
                  {
                    "type": "TextBlock",
                    "text": "Track your daily steps",
                    "horizontalAlignment": "center",
                    "wrap": true,
                    "size": "Small",
                    "height": "stretch"
                  },
                  {
                    "type": "Container",
                    "items": [
                      {
                        "type": "ActionSet",
                        "actions": [
                          {
                            "type": "Action.Submit",
                            "title": "Log Steps",
                            "style": "positive",
                            "data": {
                              "action": "logSteps"
                            }
                          }
                        ]
                      }
                    ],
                    "width": "stretch",
                    "horizontalAlignment": "center"
                  }
                ],
                "minHeight": "150px"
              }
            ]
          },
          {
            "type": "Column",
            "width": "stretch",
            "items": [
              {
                "type": "Container",
                "style": "emphasis",
                "height": "stretch",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "📊 View Stats",
                    "horizontalAlignment": "center",
                    "weight": "Bolder",
                    "color": "good"
                  },
                  {
                    "type": "TextBlock",
                    "text": "See your progress",
                    "horizontalAlignment": "center",
                    "wrap": true,
                    "size": "Small",
                    "height": "stretch"
                  },
                  {
                    "type": "Container",
                    "items": [
                      {
                        "type": "ActionSet",
                        "actions": [
                          {
                            "type": "Action.Submit",
                            "title": "My Stats",
                            "style": "positive",
                            "data": {
                              "action": "viewStats"
                            }
                          }
                        ]
                      }
                    ],
                    "width": "stretch",
                    "horizontalAlignment": "center"
                  }
                ],
                "minHeight": "150px"
              }
            ]
          },
          {
            "type": "Column",
            "width": "stretch",
            "items": [
              {
                "type": "Container",
                "style": "emphasis",
                "height": "stretch",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "🏆 Leaderboard",
                    "horizontalAlignment": "center",
                    "weight": "Bolder",
                    "color": "warning"
                  },
                  {
                    "type": "TextBlock",
                    "text": "See top steppers",
                    "horizontalAlignment": "center",
                    "wrap": true,
                    "size": "Small",
                    "height": "stretch"
                  },
                  {
                    "type": "Container",
                    "items": [
                      {
                        "type": "ActionSet",
                        "actions": [
                          {
                            "type": "Action.Submit",
                            "title": "Ranking",
                            "style": "positive",
                            "data": {
                              "action": "viewLeaderboard"
                            }
                          }
                        ]
                      }
                    ],
                    "width": "stretch",
                    "horizontalAlignment": "center"
                  }
                ],
                "minHeight": "150px"
              }
            ]
          }
        ],
        "spacing": "Medium"
      },
      {
        "type": "TextBlock",
        "text": "💡 Commands: '@voyatrek [steps] steps [date]', '@voyatrek stats', '@voyatrek leaderboard', '@voyatrek log'",
        "size": "Small",
        "isSubtle": true,
        "wrap": true,
        "spacing": "Medium"
      }
    ]
  });
  
  return { attachments: [card] };
}

  // Create a step log form card with light orange theme
  createStepLogCard() {
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    const card = CardFactory.adaptiveCard({
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.3",
      "body": [
        {
          "type": "Container",
          "style": "emphasis",
          "bleed": true,
          "backgroundImage": {
            "url": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNGRkE1MDAiIHN0b3Atb3BhY2l0eT0iMC43Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjRkY4QzAwIiBzdG9wLW9wYWNpdHk9IjAuNyIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiLz48L3N2Zz4="
          },
          "items": [
            {
              "type": "TextBlock",
              "size": "Large",
              "weight": "Bolder",
              "text": "📝 Log Your Steps 👟",
              "horizontalAlignment": "center",
              "color": "light"
            }
          ]
        },
        {
          "type": "Container",
          "items": [
            {
              "type": "TextBlock",
              "text": "To log your steps, use the command format:",
              "wrap": true
            },
            {
              "type": "TextBlock",
              "text": "@voyatrek [number] steps [date]",
              "wrap": true,
              "weight": "Bolder"
            },
            {
              "type": "TextBlock",
              "text": "Examples:",
              "spacing": "Medium"
            },
            {
              "type": "FactSet",
              "facts": [
                {
                  "title": "Today:",
                  "value": "@voyatrek 8000 steps today"
                },
                {
                  "title": "Yesterday:",
                  "value": "@voyatrek 10000 steps yesterday"
                },
                {
                  "title": "Specific date:",
                  "value": "@voyatrek 12000 steps 2025-02-15"
                }
              ]
            }
          ]
        }
      ],
      "actions": [
        {
          "type": "Action.Submit",
          "title": "8,000 steps today",
          "style": "positive",
          "data": {
            "action": "todaySteps"
          }
        },
        {
          "type": "Action.Submit",
          "title": "10,000 steps yesterday",
          "style": "positive",
          "data": {
            "action": "yesterdaySteps"
          }
        }
      ]
    });
    
    return { attachments: [card] };
  }
}

module.exports.TeamsBot = VoyaTrekBot;