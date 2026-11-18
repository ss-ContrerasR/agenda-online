import "server-only";

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";
import type { EmailTemplateConfig } from "@/lib/email/config";

/**
 * Renderizador único de correos. Lo usan tanto las notificaciones automáticas
 * de citas como la vista previa y el envío manual del panel, de modo que lo que
 * el usuario ve es exactamente lo que se envía.
 */

export type EmailRow = { label: string; value: string };

export type EmailTemplateContent = {
  previewText?: string | null;
  heading: string;
  intro?: string | null;
  rows?: EmailRow[];
  ctaUrl?: string | null;
  ctaLabel?: string | null;
  footer?: string | null;
};

const FONT_FAMILY =
  "Segoe UI, Roboto, Helvetica, Arial, sans-serif";

function isAbsoluteUrl(value: string | null | undefined): value is string {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function EmailTemplate({
  config,
  businessName,
  content,
}: {
  config: EmailTemplateConfig;
  businessName: string;
  content: EmailTemplateContent;
}) {
  const rows = content.rows ?? [];
  const socials = config.socials.filter((social) => isAbsoluteUrl(social.url));
  const showLogo = config.showLogo && isAbsoluteUrl(config.logoUrl);
  const ctaLabel = content.ctaLabel ?? config.buttonLabel;
  const showCta =
    config.layout !== "minimal" &&
    isAbsoluteUrl(content.ctaUrl) &&
    Boolean(ctaLabel);
  const footer = content.footer ?? config.footerText;
  const isCompact = config.layout === "compact";
  const isMinimal = config.layout === "minimal";

  const cardStyle = {
    backgroundColor: "#ffffff",
    border: isMinimal ? "none" : "1px solid #E2E8F0",
    borderRadius: isCompact ? "8px" : "16px",
    padding: isMinimal ? "0" : isCompact ? "20px" : "30px",
  } as const;

  return (
    <Html lang="es">
      <Head />
      {content.previewText ? <Preview>{content.previewText}</Preview> : null}
      <Body
        style={{
          backgroundColor: isMinimal ? "#ffffff" : config.backgroundColor,
          fontFamily: FONT_FAMILY,
          margin: 0,
          padding: isMinimal ? "24px 12px" : "36px 12px",
        }}
      >
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            width: "100%",
          }}
        >
          <Section
            style={{
              padding: isCompact ? "0 0 14px" : "0 0 22px",
              textAlign: isCompact ? "left" : "center",
            }}
          >
            {showLogo ? (
              <Img
                src={config.logoUrl ?? ""}
                alt={businessName}
                width="128"
                style={{
                  display: isCompact ? "inline-block" : "block",
                  margin: isCompact ? "0 10px 0 0" : "0 auto",
                  maxWidth: "128px",
                  height: "auto",
                  verticalAlign: "middle",
                }}
              />
            ) : null}
            {isCompact ? (
              <Text
                style={{
                  display: "inline-block",
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: 700,
                  color: config.textColor,
                  verticalAlign: "middle",
                }}
              >
                {businessName}
              </Text>
            ) : showLogo ? null : (
              <Text
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  color: config.textColor,
                }}
              >
                {businessName}
              </Text>
            )}
            {config.headerTitle ? (
              <Heading
                as="h1"
                style={{
                  margin: isCompact ? "10px 0 0" : "18px 0 0",
                  fontSize: isCompact ? "20px" : "24px",
                  lineHeight: "1.3",
                  color: config.textColor,
                }}
              >
                {config.headerTitle}
              </Heading>
            ) : null}
            {config.headerSubtitle ? (
              <Text
                style={{
                  margin: "8px 0 0",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  color: "#64748B",
                }}
              >
                {config.headerSubtitle}
              </Text>
            ) : null}
          </Section>

          <Section style={cardStyle}>
            <Heading
              as="h2"
              style={{
                margin: 0,
                fontSize: isCompact ? "18px" : "20px",
                lineHeight: "1.35",
                color: config.textColor,
              }}
            >
              {content.heading}
            </Heading>

            {content.intro ? (
              <Text
                style={{
                  margin: "12px 0 0",
                  fontSize: "14px",
                  lineHeight: "1.65",
                  color: "#475569",
                }}
              >
                {content.intro}
              </Text>
            ) : null}

            {config.showDetails && rows.length > 0 ? (
              <table
                role="presentation"
                width="100%"
                cellPadding="0"
                cellSpacing="0"
                style={{
                  marginTop: isCompact ? "16px" : "22px",
                  borderTop: "1px solid #E2E8F0",
                }}
              >
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label}>
                      <td
                        style={{
                          padding: isCompact ? "8px 0" : "10px 0",
                          borderBottom: "1px solid #F1F5F9",
                          color: "#64748B",
                          fontSize: "13px",
                          width: "40%",
                          verticalAlign: "top",
                        }}
                      >
                        {row.label}
                      </td>
                      <td
                        style={{
                          padding: isCompact ? "8px 0" : "10px 0",
                          borderBottom: "1px solid #F1F5F9",
                          color: config.textColor,
                          fontSize: "13px",
                          fontWeight: 600,
                          verticalAlign: "top",
                        }}
                      >
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {showCta ? (
              <Section style={{ marginTop: "26px", textAlign: "left" }}>
                <Button
                  href={content.ctaUrl ?? "#"}
                  style={{
                    backgroundColor: config.accentColor,
                    borderRadius: "10px",
                    color: "#ffffff",
                    display: "inline-block",
                    fontSize: "14px",
                    fontWeight: 600,
                    padding: "12px 22px",
                    textDecoration: "none",
                  }}
                >
                  {ctaLabel}
                </Button>
              </Section>
            ) : null}

            {isMinimal && isAbsoluteUrl(content.ctaUrl) ? (
              <Text style={{ margin: "18px 0 0", fontSize: "14px" }}>
                <Link
                  href={content.ctaUrl}
                  style={{ color: config.accentColor, textDecoration: "underline" }}
                >
                  {ctaLabel ?? content.ctaUrl}
                </Link>
              </Text>
            ) : null}
          </Section>

          <Section
            style={{
              padding: isMinimal ? "20px 0 0" : "22px 10px 0",
              textAlign: isCompact ? "left" : "center",
            }}
          >
            {socials.length > 0 ? (
              <Text
                style={{
                  margin: "0 0 10px",
                  fontSize: "13px",
                  lineHeight: "1.8",
                  color: "#64748B",
                }}
              >
                {socials.map((social, index) => (
                  <span key={`${social.label}-${index}`}>
                    {index > 0 ? " · " : null}
                    <Link
                      href={social.url}
                      style={{ color: config.accentColor, textDecoration: "none" }}
                    >
                      {social.label}
                    </Link>
                  </span>
                ))}
              </Text>
            ) : null}

            {footer ? (
              <Text
                style={{
                  margin: 0,
                  fontSize: "12px",
                  lineHeight: "1.6",
                  color: "#94A3B8",
                }}
              >
                {footer}
              </Text>
            ) : null}

            <Hr
              style={{
                borderColor: "#E2E8F0",
                margin: "16px 0 10px",
              }}
            />
            <Text
              style={{
                margin: 0,
                fontSize: "11px",
                lineHeight: "1.6",
                color: "#CBD5E1",
              }}
            >
              Enviado por {businessName} con AgendaTEX
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderEmailHtml(input: {
  config: EmailTemplateConfig;
  businessName: string;
  content: EmailTemplateContent;
  /** La vista previa solo necesita el HTML; evita el render de texto plano. */
  includePlainText?: boolean;
}): Promise<{ html: string; text: string }> {
  const element = (
    <EmailTemplate
      config={input.config}
      businessName={input.businessName}
      content={input.content}
    />
  );

  const htmlPromise = render(element, { pretty: true });
  if (input.includePlainText === false) {
    return { html: await htmlPromise, text: "" };
  }

  const [html, text] = await Promise.all([
    htmlPromise,
    render(element, { plainText: true }),
  ]);

  return { html, text };
}
