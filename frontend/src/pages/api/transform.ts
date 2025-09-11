import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { style, image_url } = req.body;

    if (!style || !image_url) {
      return res.status(400).json({ error: 'Missing style or image_url' });
    }

    if (!process.env.PHOTOROOM_KEY) {
      return res.status(500).json({ error: 'PhotoRoom API key not configured' });
    }

    const response = await fetch("https://image-api.photoroom.com/v2/edit", {
      method: "POST",
      headers: {
        "x-api-key": process.env.PHOTOROOM_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        image_url, 
        filter: style 
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('PhotoRoom API error:', errorData);
      return res.status(response.status).json({ 
        error: 'PhotoRoom API request failed',
        details: errorData 
      });
    }

    const data = await response.json();
    const { output_url } = data;

    if (!output_url) {
      return res.status(500).json({ error: 'No output_url received from PhotoRoom' });
    }

    res.status(200).json({ url: output_url });
  } catch (error) {
    console.error('Transform API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}