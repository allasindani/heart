import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import net from "net";
import multer from "multer";
import fs from "fs";
import compression from "compression";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'));
  }
});
const upload = multer({ storage });

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, "0.0.0.0");
  });
}

async function getAvailablePort(startPort: number): Promise<number> {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    console.log(`Port ${port} is in use, trying ${port + 1}...`);
    port++;
    if (port > startPort + 100) {
      throw new Error("Could not find an available port in range.");
    }
  }
  return port;
}

import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(compression());
  app.use(express.json());
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Support for custom domains and Google Auth
  app.use((req, res, next) => {
    const host = req.get('host');
    if (host === 'chat.opramixes.com' || host === 'www.chat.opramixes.com') {
      // Logic for custom domain if needed
    }
    next();
  });

  // Stripe Checkout Endpoint
  app.post("/api/create-checkout-session", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe is not configured' });
    }

    const { tier, price, userId } = req.body;

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${tier} Membership - Heart Connect`,
                description: `Unlock premium features for your account.`,
              },
              unit_amount: price * 100,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.get('origin') || 'https://chat.opramixes.com'}/?payment=success&tier=${tier}`,
        cancel_url: `${req.get('origin') || 'https://chat.opramixes.com'}/?payment=cancel`,
        metadata: {
          userId,
          tier
        }
      });

      res.json({ id: session.id, url: session.url });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API routes
  app.get("/api/update", (req, res) => {
    // This endpoint will return the latest version and update zip url
    res.json({
      version: "1.0.1",
      url: `https://${req.get('host')}/heart-connect-update.zip`
    });
  });

  // Serve the update zip if requested
  app.get("/heart-connect-update.zip", (req, res) => {
    const zipPath = path.join(process.cwd(), 'dist', 'heart-connect-update.zip');
    if (fs.existsSync(zipPath)) {
      res.set('Content-Type', 'application/zip');
      res.sendFile(zipPath);
    } else {
      res.status(404).send('Update file not found. Please run npm run bundle-update first.');
    }
  });

  // API for version check
  app.get("/api/update", (req, res) => {
    // In a real app, you'd pull this from package.json or a database
    res.json({
      version: "1.0.1",
      url: "https://chat.opramixes.com/heart-connect-update.zip"
    });
  });

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "online",
      server: "Production Node",
      storage: "NVMe",
      features: ["Reels", "Chat", "Dating", "Blockbuster"],
      nodeVersion: "v24.14.1",
      port: PORT,
      timestamp: new Date().toISOString()
    });
  });

  app.post("/api/upload", upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  // Dedicated WhatsApp Welcome Page
  app.get("/welcome", async (req, res) => {
    const welcomeMessage = process.env.WELCOME_MESSAGE || "Welcome to Heart Connect! 💖"
    const siteName = "Heart Connect"
    
    // Fetch some users for the welcome page
    let featuredUsers: any[] = []
    try {
      const projectId = "gen-lang-client-0473830905"
      const dbId = "ai-studio-6ff02b76-2504-4b84-82d1-98a73de1f5a4"
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/users?pageSize=10`
      const fRes = await fetch(url)
      const data: any = await fRes.json()
      if (data.documents) {
        featuredUsers = data.documents
          .map((doc: any) => {
            const fields = doc.fields || {}
            return {
              displayName: fields.displayName?.stringValue || "User",
              photoURL: fields.photoURL?.stringValue || "https://picsum.photos/seed/user/200",
              city: fields.datingProfile?.mapValue?.fields?.city?.stringValue || "Nearby",
              isVerified: fields.isVerified?.booleanValue || false
            }
          })
          .filter((u: any) => u.photoURL && !u.photoURL.includes('null'))
          .slice(0, 8)
      }
    } catch (e) {
      console.error("Welcome page fetch error:", e)
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${siteName} - Welcome</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap">
          <style>
              body { 
                background-color: #f0f2f5; 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                overflow-x: hidden;
              }
              .whatsapp-gradient {
                background: linear-gradient(135deg, #00a884 0%, #008069 100%);
              }
              .animate-float {
                animation: float 6s ease-in-out infinite;
              }
              @keyframes float {
                0%, 100% { transform: translateY(0px) rotate(12deg); }
                50% { transform: translateY(-20px) rotate(15deg); }
              }
              .no-scrollbar::-webkit-scrollbar { display: none; }
              .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          </style>
      </head>
      <body class="flex flex-col items-center justify-center min-h-screen p-4 md:p-8">
          <div class="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.12)] max-w-2xl w-full text-center border border-white/20 relative overflow-hidden">
              <div class="absolute top-0 left-0 w-full h-2 whatsapp-gradient"></div>
              
              <div class="mb-8 flex justify-center">
                  <div class="whatsapp-gradient p-6 rounded-[2rem] shadow-2xl animate-float">
                     <svg class="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.93.55 3.73 1.5 5.25L2 22l4.75-1.5c1.52.95 3.32 1.5 5.25 1.5 5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.63 0-3.13-.54-4.34-1.45l-.31-.22-2.8.88.88-2.8-.22-.31C4.54 15.13 4 13.63 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/>
                     </svg>
                  </div>
              </div>

              <h1 class="text-3xl md:text-4xl font-black text-gray-900 mb-4 tracking-tight leading-tight uppercase">
                  ${welcomeMessage}
              </h1>

              <p class="text-gray-500 mb-8 text-base md:text-lg font-medium max-w-md mx-auto">
                  Zimbabwe's #1 Social & Dating Platform.
              </p>

              <!-- Users Grid -->
              <div class="mb-10 text-left">
                <div class="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                  <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Singles Online</h3>
                  <div class="flex items-center gap-1">
                    <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span class="text-[9px] font-bold text-green-500 uppercase">Live Matches</span>
                  </div>
                </div>
                <div class="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  ${featuredUsers.length > 0 ? featuredUsers.map(u => `
                    <div class="flex-shrink-0 w-24 text-center group translate-y-0 hover:-translate-y-1 transition-transform">
                      <div class="relative w-24 h-24 mx-auto rounded-[1.5rem] overflow-hidden border-2 border-white shadow-xl">
                        <img src="${u.photoURL}" class="w-full h-full object-cover" alt="${u.displayName}">
                        ${u.isVerified ? `
                          <div class="absolute bottom-2 right-2 bg-[#00a884] rounded-full p-0.5 border border-white shadow-sm">
                            <svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                          </div>
                        ` : ''}
                      </div>
                      <p class="text-[10px] font-black mt-3 truncate text-gray-800">${u.displayName.split(' ')[0]}</p>
                      <p class="text-[8px] font-bold text-gray-400 truncate uppercase mt-0.5">${u.city}</p>
                    </div>
                  `).join('') : `
                    <div class="w-full py-6 text-center text-gray-300 text-xs italic font-medium">Scanning for nearby hearts...</div>
                  `}
                </div>
              </div>

              <div class="space-y-4">
                <a href="/" class="block w-full whatsapp-gradient text-white font-black px-12 py-5 rounded-[1.5rem] shadow-2xl shadow-[#00a884]/30 hover:scale-[1.02] active:scale-[0.98] transition-all text-xl uppercase tracking-wider">
                    Get Started Now
                </a>
                <div class="flex items-center justify-center gap-4 pt-4">
                  <div class="text-[9px] text-gray-400 font-black uppercase tracking-widest">Available on</div>
                  <div class="flex gap-2">
                    <span class="bg-gray-100 px-2 py-1 rounded text-[8px] font-bold text-gray-500">Android</span>
                    <span class="bg-gray-100 px-2 py-1 rounded text-[8px] font-bold text-gray-500">iOS</span>
                    <span class="bg-gray-100 px-2 py-1 rounded text-[8px] font-bold text-gray-500">Web</span>
                  </div>
                </div>
              </div>
          </div>
      </body>
      </html>
    `);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started successfully`);
    console.log(`Listening on port: ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Vite Dev Mode: ${process.env.NODE_ENV !== "production"}`);
  });
}

startServer();
