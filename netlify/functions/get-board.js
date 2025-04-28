const { Octokit } = require("@octokit/rest");
require('dotenv').config();

exports.handler = async (event) => {
    const code = event.path.split("/").pop();

    if (!code) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing board code" })
        };
    }

    try {
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });

        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;
        const path = `boards/${code}.json`;

        try {
            const { data } = await octokit.repos.getContent({
                owner,
                repo,
                path
            });

            const content = Buffer.from(data.content, 'base64').toString();

            return {
                statusCode: 200,
                body: content
            };
        } catch (error) {
            console.error("GitHub API error:", error);
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "Board not found" })
            };
        }
    } catch (error) {
        console.error("Function error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Server error" })
        };
    }
};
