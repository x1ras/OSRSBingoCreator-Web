const { Octokit } = require("@octokit/rest");
require('dotenv').config();

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { code, boardData } = JSON.parse(event.body);

        if (!code || !boardData) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing required data" })
            };
        }

        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });

        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;
        const path = `boards/${code}.json`;

        try {
            let fileSha;
            try {
                const { data } = await octokit.repos.getContent({
                    owner,
                    repo,
                    path
                });
                fileSha = data.sha;
            } catch (error) {
            }

            await octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path,
                message: `Update board ${code}`,
                content: Buffer.from(JSON.stringify(boardData)).toString('base64'),
                sha: fileSha
            });

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Board saved successfully",
                    code: shortCode
                })
            };
        } catch (error) {
            console.error("GitHub API error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: "Error saving to GitHub" })
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
