/**
 * PRism Demo Fixtures
 * High-fidelity, clearly labelled mock datasets used exclusively in Demo Mode
 * for hackathon demos, presentations, and offline testing.
 */

export const DEMO_PRS = [
  {
    id: 'demo-critical',
    label: 'Critical Risk: Auth Bypass & SQL Injection',
    badgeText: 'CRITICAL (94/100)',
    badgeColor: 'critical',
    url: 'https://github.com/acme-corp/core-auth-service/pull/142',
    data: {
      repository: 'acme-corp/core-auth-service',
      pr_number: 142,
      title: 'feat: add local dev auth bypass and dynamic user lookup',
      author: 'dev-sam',
      base_branch: 'main',
      head_branch: 'sam/quick-dev-bypass',
      created_at: '2026-10-13T10:15:00Z',
      risk_score: 94,
      risk_level: 'CRITICAL',
      ai_summary:
        'CRITICAL RISK DETECTED: This pull request introduces an unauthenticated bypass flag into core JWT verification middleware, exposes raw cryptographic secrets via an unauthenticated debug route, and replaces parameterized database statements with string interpolation vulnerable to SQL injection.',
      findings: [
        {
          id: 'crit-01',
          title: 'Unauthenticated JWT Verification Bypass in Core Middleware',
          severity: 'CRITICAL',
          category: 'Authentication Bypass (CWE-287)',
          file_path: 'src/middleware/auth.js',
          line_number: 42,
          description:
            'A fallback check bypasses cryptographic token verification when the query parameter ?skipAuth=1 or headers contain X-Dev-Bypass. This creates an immediate remote code authentication bypass if deployed to staging or production.',
          evidence: `@@ -40,6 +40,11 @@ exports.verifyToken = (req, res, next) => {
   const token = req.headers['authorization'];
+  // Fast dev override - DO NOT COMMIT TO PROD
+  if (req.query.skipAuth === '1' || req.headers['x-dev-bypass']) {
+    req.user = { id: 'admin', role: 'superadmin' };
+    return next();
+  }
   if (!token) return res.status(401).json({ error: 'Missing token' });`,
          recommendation:
            'Reject PR immediately. Remove the dev override condition from production codebase. Use isolated local mock servers rather than modifying production middleware.',
          cwe: 'CWE-287',
        },
        {
          id: 'crit-02',
          title: 'Direct SQL Injection via Raw Template String Concatenation',
          severity: 'CRITICAL',
          category: 'Injection (CWE-89)',
          file_path: 'src/controllers/userController.js',
          line_number: 88,
          description:
            'The new user lookup handler constructs database query strings via unescaped string interpolation with req.query.email, permitting full SQL injection and database dump.',
          evidence: `@@ -85,4 +85,4 @@ exports.findUser = async (req, res) => {
-  const [user] = await db.query('SELECT * FROM users WHERE email = $1', [req.query.email]);
+  const query = \`SELECT * FROM users WHERE email = '\${req.query.email}'\`;
+  const [user] = await db.query(query);
   return res.json(user);`,
          recommendation:
            'Revert to parameterized query bindings ($1). Never interpolate untrusted user input directly into SQL statements.',
          cwe: 'CWE-89',
        },
        {
          id: 'high-01',
          title: 'Hardcoded Cryptographic Secret & Debug Route Exposure',
          severity: 'HIGH',
          category: 'Sensitive Data Exposure (CWE-798)',
          file_path: 'src/routes/debug.js',
          line_number: 16,
          description:
            'A newly added debug route /api/v1/debug/keys returns active JWT signing secrets and environment configurations in plain text without authorization.',
          evidence: `@@ -12,2 +12,6 @@ router.get('/health', (req, res) => res.send('ok'));
+router.get('/debug/keys', (req, res) => {
+  res.json({ secret: process.env.JWT_SECRET || 'fallback_secret_key_2026', env: process.env });
+});`,
          recommendation:
            'Remove this route entirely. Cryptographic private keys must never be exposed via HTTP endpoints under any circumstance.',
          cwe: 'CWE-798',
        },
        {
          id: 'med-01',
          title: 'Missing Rate Limiting on Login Handler',
          severity: 'MEDIUM',
          category: 'Denial of Service & Brute Force (CWE-307)',
          file_path: 'src/routes/auth.js',
          line_number: 29,
          description:
            'New authentication route does not apply rate limiting middleware, leaving login vulnerable to brute-force credential stuffing attacks.',
          evidence: `@@ -27,2 +27,2 @@
-router.post('/login', rateLimiter, authController.login);
+router.post('/login', authController.login);`,
          recommendation:
            'Re-attach the rateLimiter middleware to the login route.',
          cwe: 'CWE-307',
        },
      ],
      recommendations: [
        {
          id: 'rec-01',
          action: 'BLOCK MERGE: Revert the authentication bypass in src/middleware/auth.js before any deployment',
          priority: 'CRITICAL',
          isBlocker: true,
          category: 'Security Gate',
        },
        {
          id: 'rec-02',
          action: 'Refactor src/controllers/userController.js to use parameterized SQL statements ($1)',
          priority: 'CRITICAL',
          isBlocker: true,
          category: 'Code Fix',
        },
        {
          id: 'rec-03',
          action: 'Delete debug endpoint /debug/keys in src/routes/debug.js',
          priority: 'HIGH',
          isBlocker: true,
          category: 'Configuration',
        },
        {
          id: 'rec-04',
          action: 'Re-enable rate limiting middleware on auth routes in src/routes/auth.js',
          priority: 'MEDIUM',
          isBlocker: false,
          category: 'Best Practice',
        },
      ],
      changed_files: [
        {
          filename: 'src/middleware/auth.js',
          status: 'modified',
          additions: 6,
          deletions: 1,
          changes: 7,
          isSensitive: true,
        },
        {
          filename: 'src/controllers/userController.js',
          status: 'modified',
          additions: 3,
          deletions: 2,
          changes: 5,
          isSensitive: true,
        },
        {
          filename: 'src/routes/debug.js',
          status: 'added',
          additions: 18,
          deletions: 0,
          changes: 18,
          isSensitive: true,
        },
        {
          filename: 'src/routes/auth.js',
          status: 'modified',
          additions: 1,
          deletions: 1,
          changes: 2,
          isSensitive: true,
        },
        {
          filename: 'package.json',
          status: 'modified',
          additions: 1,
          deletions: 0,
          changes: 1,
          isSensitive: false,
        },
      ],
      stats: {
        totalFiles: 5,
        additions: 29,
        deletions: 4,
        criticalFindings: 2,
        highFindings: 1,
        mediumFindings: 1,
        lowFindings: 0,
      },
    },
  },
  {
    id: 'demo-high',
    label: 'High Risk: Public S3 Bucket & Unmasked PII Logs',
    badgeText: 'HIGH (76/100)',
    badgeColor: 'high',
    url: 'https://github.com/cloudscale/payment-gateway-api/pull/89',
    data: {
      repository: 'cloudscale/payment-gateway-api',
      pr_number: 89,
      title: 'chore: configure receipt storage bucket & verbose webhook logging',
      author: 'billing-eng',
      base_branch: 'main',
      head_branch: 'billing/receipts-s3',
      created_at: '2026-10-12T16:40:00Z',
      risk_score: 76,
      risk_level: 'HIGH',
      ai_summary:
        'HIGH RISK DETECTED: Infrastructure and application modifications in this PR set customer invoice S3 buckets to public-read ACL and output unredacted credit card payloads into cloud logging streams.',
      findings: [
        {
          id: 'high-01',
          title: 'Public Read Access Enabled on S3 Customer Invoices Bucket',
          severity: 'HIGH',
          category: 'Cloud Misconfiguration (CWE-732)',
          file_path: 'infra/storage.tf',
          line_number: 19,
          description:
            'Terraform resource aws_s3_bucket_acl specifies "public-read" on invoices_bucket, exposing sensitive customer billing records to the public internet.',
          evidence: `@@ -18,2 +18,2 @@ resource "aws_s3_bucket" "invoices" {
-  acl    = "private"
+  acl    = "public-read"`,
          recommendation:
            'Maintain private ACL and use pre-signed URLs with short expiration (e.g. 15 minutes) for legitimate user downloads.',
          cwe: 'CWE-732',
        },
        {
          id: 'high-02',
          title: 'Unredacted Payment Card Data Logged to Application Traces',
          severity: 'HIGH',
          category: 'PCI-DSS Compliance Violation (CWE-532)',
          file_path: 'src/services/stripeHandler.js',
          line_number: 63,
          description:
            'Webhook handler logs raw cardholder data (PAN, CVV, exp_month) into stdout and centralized logging.',
          evidence: `@@ -60,2 +60,3 @@ exports.handlePayment = async (payload) => {
+  logger.info("Raw payment intent received: " + JSON.stringify(payload.payment_method));
   const result = await stripe.charges.create(payload);`,
          recommendation:
            'Mask payment details before logging or utilize tokenized customer identifiers only.',
          cwe: 'CWE-532',
        },
      ],
      recommendations: [
        {
          id: 'rec-01',
          action: 'Revert S3 bucket ACL to private in infra/storage.tf',
          priority: 'HIGH',
          isBlocker: true,
          category: 'Infrastructure',
        },
        {
          id: 'rec-02',
          action: 'Sanitize payment object logging in src/services/stripeHandler.js',
          priority: 'HIGH',
          isBlocker: true,
          category: 'Compliance',
        },
      ],
      changed_files: [
        {
          filename: 'infra/storage.tf',
          status: 'modified',
          additions: 4,
          deletions: 1,
          changes: 5,
          isSensitive: true,
        },
        {
          filename: 'src/services/stripeHandler.js',
          status: 'modified',
          additions: 6,
          deletions: 2,
          changes: 8,
          isSensitive: true,
        },
      ],
      stats: {
        totalFiles: 2,
        additions: 10,
        deletions: 3,
        criticalFindings: 0,
        highFindings: 2,
        mediumFindings: 0,
        lowFindings: 0,
      },
    },
  },
  {
    id: 'demo-low',
    label: 'Low Risk: Documentation & Clean Typo Fix',
    badgeText: 'LOW (12/100)',
    badgeColor: 'low',
    url: 'https://github.com/prism-platform/docs-and-client/pull/310',
    data: {
      repository: 'prism-platform/docs-and-client',
      pr_number: 310,
      title: 'docs: clarify risk triage scoring formula and fix markdown link',
      author: 'sarah-contributor',
      base_branch: 'main',
      head_branch: 'sarah/fix-formula-docs',
      created_at: '2026-10-11T09:20:00Z',
      risk_score: 12,
      risk_level: 'LOW',
      ai_summary:
        'LOW RISK - SAFE TO MERGE: No security vulnerabilities, credential exposures, or logic modifications found. Changes are purely cosmetic documentation clarifications in non-executable files.',
      findings: [
        {
          id: 'low-01',
          title: 'Deprecation Notice: Link points to legacy documentation wiki',
          severity: 'LOW',
          category: 'Documentation Maintenance',
          file_path: 'README.md',
          line_number: 52,
          description:
            'URL points to older v1 documentation domain. Not a security vulnerability.',
          evidence: `@@ -50,2 +50,2 @@ For architecture details, see:
-https://legacy-wiki.prism.internal/spec
+https://docs.prism.dev/v2/architecture`,
          recommendation:
            'Verify link destination resolves to active documentation page.',
          cwe: null,
        },
      ],
      recommendations: [
        {
          id: 'rec-01',
          action: 'Approve pull request after standard markdown spelling verification.',
          priority: 'LOW',
          isBlocker: false,
          category: 'Reviewer Action',
        },
      ],
      changed_files: [
        {
          filename: 'README.md',
          status: 'modified',
          additions: 4,
          deletions: 2,
          changes: 6,
          isSensitive: false,
        },
      ],
      stats: {
        totalFiles: 1,
        additions: 4,
        deletions: 2,
        criticalFindings: 0,
        highFindings: 0,
        mediumFindings: 0,
        lowFindings: 1,
      },
    },
  },
];

export const DEMO_OVERVIEW_METRICS = {
  totalAnalyzed: 148,
  criticalBlocked: 19,
  highFlagged: 24,
  avgTriageLatency: '1.4s',
  autoMergedSafe: 105,
  riskDistribution: [
    { level: 'CRITICAL', count: 19, percentage: 13, color: '#EF4444' },
    { level: 'HIGH', count: 24, percentage: 16, color: '#F97316' },
    { level: 'MEDIUM', count: 32, percentage: 22, color: '#EAB308' },
    { level: 'LOW / SAFE', count: 73, percentage: 49, color: '#10B981' },
  ],
  recentActivity: [
    {
      id: 'act-1',
      repo: 'acme-corp/core-auth-service',
      prNumber: 142,
      title: 'feat: add local dev auth bypass and dynamic user lookup',
      author: 'dev-sam',
      riskScore: 94,
      riskLevel: 'CRITICAL',
      findingsCount: 4,
      timeAgo: '12m ago',
      fixtureId: 'demo-critical',
    },
    {
      id: 'act-2',
      repo: 'cloudscale/payment-gateway-api',
      prNumber: 89,
      title: 'chore: configure receipt storage bucket & verbose webhook logging',
      author: 'billing-eng',
      riskScore: 76,
      riskLevel: 'HIGH',
      findingsCount: 2,
      timeAgo: '42m ago',
      fixtureId: 'demo-high',
    },
    {
      id: 'act-3',
      repo: 'prism-platform/docs-and-client',
      prNumber: 310,
      title: 'docs: clarify risk triage scoring formula and fix markdown link',
      author: 'sarah-contributor',
      riskScore: 12,
      riskLevel: 'LOW',
      findingsCount: 1,
      timeAgo: '2h ago',
      fixtureId: 'demo-low',
    },
    {
      id: 'act-4',
      repo: 'infrastructure/k8s-manifests',
      prNumber: 45,
      title: 'fix: restrict container securityContext and drop root caps',
      author: 'devops-lead',
      riskScore: 24,
      riskLevel: 'LOW',
      findingsCount: 0,
      timeAgo: '4h ago',
    },
    {
      id: 'act-5',
      repo: 'acme-corp/customer-portal',
      prNumber: 219,
      title: 'refactor: update dependencies & upgrade tailwind plugins',
      author: 'frontend-lead',
      riskScore: 48,
      riskLevel: 'MEDIUM',
      findingsCount: 2,
      timeAgo: '6h ago',
    },
  ],
};

