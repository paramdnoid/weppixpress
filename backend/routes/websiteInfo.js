import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/authenticate.js';
import { getWebsiteInfo, probe } from '../services/websiteInfoService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Rate limit to prevent abuse - 30 requests per minute
const websiteInfoLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    error: {
      message: 'Too many website info requests, please try again later.',
      code: 'WEBSITE_INFO_RATE_LIMIT_EXCEEDED',
      retryAfter: 60
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply authentication and rate limiting
router.use(authenticateToken);
router.use(websiteInfoLimiter);

/**
 * @swagger
 * /api/website-info/analyze:
 *   get:
 *     summary: Analyze website information
 *     description: Extract metadata, images, links, and structured data from a website
 *     tags: [Website Info]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         description: The website URL to analyze
 *         schema:
 *           type: string
 *           example: "https://example.com"
 *       - in: query
 *         name: timeout
 *         required: false
 *         description: Request timeout in milliseconds (default 12000)
 *         schema:
 *           type: integer
 *           minimum: 1000
 *           maximum: 30000
 *           example: 12000
 *     responses:
 *       200:
 *         description: Website information successfully extracted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 url:
 *                   type: string
 *                   example: "https://example.com"
 *                 title:
 *                   type: string
 *                   example: "Example Domain"
 *                 description:
 *                   type: string
 *                   example: "This domain is for use in illustrative examples"
 *                 favicon:
 *                   type: string
 *                   example: "https://example.com/favicon.ico"
 *                 siteName:
 *                   type: string
 *                   example: "Example Site"
 *                 lang:
 *                   type: string
 *                   example: "en"
 *                 og:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     image:
 *                       type: string
 *                     type:
 *                       type: string
 *                 headings:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       tag:
 *                         type: string
 *                         example: "h1"
 *                       text:
 *                         type: string
 *                         example: "Welcome to Example"
 *                 images:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       src:
 *                         type: string
 *                       alt:
 *                         type: string
 *                 links:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       href:
 *                         type: string
 *                       text:
 *                         type: string
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     wordCount:
 *                       type: integer
 *                       example: 247
 *                 structuredData:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Missing or invalid URL parameter
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error during website analysis
 */
router.get('/analyze', async (req, res) => {
  const { url, timeout } = req.query;
  
  if (!url) {
    return res.status(400).json({
      error: {
        message: 'Missing url query parameter',
        code: 'MISSING_URL_PARAMETER'
      }
    });
  }

  const urlStr = String(url).trim();
  if (!urlStr) {
    return res.status(400).json({
      error: {
        message: 'URL parameter cannot be empty',
        code: 'EMPTY_URL_PARAMETER'
      }
    });
  }

  try {
    // Parse timeout with validation
    let timeoutMs = 12000; // Default 12 seconds
    if (timeout) {
      const parsedTimeout = parseInt(timeout);
      if (!isNaN(parsedTimeout) && parsedTimeout >= 1000 && parsedTimeout <= 30000) {
        timeoutMs = parsedTimeout;
      }
    }

    logger.info('Website info request', {
      userId: req.user?.id,
      url: urlStr,
      timeout: timeoutMs,
      userAgent: req.get('User-Agent')
    });

    const info = await getWebsiteInfo(urlStr, { timeoutMs });
    
    // Log successful analysis
    if (info.ok) {
      logger.info('Website info analysis successful', {
        userId: req.user?.id,
        url: info.url,
        title: info.title,
        wordCount: info.metrics?.wordCount,
        imageCount: info.images?.length,
        linkCount: info.links?.length
      });
    } else {
      logger.warn('Website info analysis failed', {
        userId: req.user?.id,
        url: urlStr,
        error: info.error,
        status: info.status
      });
    }

    const responseStatus = info.ok ? 200 : (info.status >= 400 ? info.status : 502);
    res.status(responseStatus).json(info);

  } catch (error) {
    logger.error('Website info service error', {
      userId: req.user?.id,
      url: urlStr,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      ok: false,
      error: {
        message: 'Failed to analyze website',
        code: 'WEBSITE_ANALYSIS_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

/**
 * @swagger
 * /api/website-info/probe:
 *   get:
 *     summary: Quick website availability check
 *     description: Perform a lightweight HEAD request to check if a website is accessible
 *     tags: [Website Info]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         description: The website URL to probe
 *         schema:
 *           type: string
 *           example: "https://example.com"
 *     responses:
 *       200:
 *         description: Website probe result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 url:
 *                   type: string
 *                   example: "https://example.com"
 *                 error:
 *                   type: string
 *                   description: Error message if probe failed
 *       400:
 *         description: Missing or invalid URL parameter
 *       429:
 *         description: Rate limit exceeded
 */
router.get('/probe', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({
      error: {
        message: 'Missing url query parameter',
        code: 'MISSING_URL_PARAMETER'
      }
    });
  }

  const urlStr = String(url).trim();
  if (!urlStr) {
    return res.status(400).json({
      error: {
        message: 'URL parameter cannot be empty',
        code: 'EMPTY_URL_PARAMETER'
      }
    });
  }

  try {
    logger.info('Website probe request', {
      userId: req.user?.id,
      url: urlStr
    });

    const result = await probe(urlStr);
    
    logger.info('Website probe completed', {
      userId: req.user?.id,
      url: result.url || urlStr,
      ok: result.ok,
      status: result.status
    });

    res.json(result);

  } catch (error) {
    logger.error('Website probe error', {
      userId: req.user?.id,
      url: urlStr,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      ok: false,
      error: {
        message: 'Failed to probe website',
        code: 'WEBSITE_PROBE_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

export default router;