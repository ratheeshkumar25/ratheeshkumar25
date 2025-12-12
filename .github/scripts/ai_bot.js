const { OpenAI } = require("openai");
const github = require("@actions/github");
const core = require("@actions/core");

async function run() {
    const token = process.env.GITHUB_TOKEN;
    const groqKey = process.env.GROQ_API_KEY;

    if (!token || !groqKey) {
        console.error("Missing GITHUB_TOKEN or GROQ_API_KEY");
        process.exit(1);
    }

    const octokit = github.getOctokit(token);
    const context = github.context;
    const issue = context.payload.issue;

    try {
        const question = issue.title + "\n\n" + issue.body;
        console.log("Analyzing question: " + question.substring(0, 50) + "...");

        const openai = new OpenAI({
            apiKey: groqKey,
            baseURL: "https://api.groq.com/openai/v1"
        });

        const completion = await openai.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are Ratheesh Kumar, a passionate Golang backend developer. 
          - You Answer questions about Golang, PostgreSQL, MySQL, MongoDB, DevOps (Docker/K8s), and System Design.
          - Be helpful, professional, but slightly casual and friendly.
          - If the question is unrelated to tech or your profile, politely redirect them.
          - Your email is ratheesh.k@hybridsolutions.com.
          - Keep answers concise and strictly relevant to the question.`
                },
                { role: "user", content: question }
            ],
            max_tokens: 500,
        });

        const answer = completion.choices[0].message.content;

        await octokit.rest.issues.createComment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: issue.number,
            body: `## 🤖 AI Response\n\n${answer}\n\n---\n*Powered by Groq & GitHub Actions*`
        });

    } catch (error) {
        console.error(error);
        // Try to post the specific error message to the issue for debugging
        try {
            await octokit.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issue.number,
                body: `❌ **Bot Error**: I encountered an error while processing your request.\n\n\`\`\`\n${error.message}\n\`\`\``
            });
        } catch (commentError) {
            console.error("Failed to post error comment:", commentError);
        }
        process.exit(1);
    }
}

run();