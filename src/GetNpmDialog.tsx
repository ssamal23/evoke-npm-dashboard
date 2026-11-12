import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Modal } from './components/Modal';
import { saveRegistration } from './registrations';
import './GetNpmDialog.css';

interface Props {
  version: string;
  /** npm package name, e.g. "@evoke-tech/stencil-ui-kit" */
  packageName: string;
  /** Link to this version's page on npmjs.com */
  npmUrl: string;
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
}

const BoxIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />
  </svg>
);
const CheckIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12l5 5 9-10" />
  </svg>
);
const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" />
  </svg>
);

/** Two steps: ask for client and project, then show the install command. */
export function GetNpmDialog({ version, packageName, npmUrl, onClose, returnFocusTo }: Props) {
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [client, setClient] = useState('');
  const [project, setProject] = useState('');
  const [errors, setErrors] = useState<{ client?: string; project?: string }>({});
  const [copied, setCopied] = useState(false);
  const doneButton = useRef<HTMLButtonElement>(null);
  const command = `npm i ${packageName}@${version}`;

  useEffect(() => {
    if (step === 'done') doneButton.current?.focus();
  }, [step]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = {
      client: client.trim() ? undefined : 'Enter a client name to get the link.',
      project: project.trim() ? undefined : 'Enter a project name to get the link.',
    };
    setErrors(next);
    if (next.client || next.project) {
      // send focus to the first field that needs fixing
      document.getElementById(next.client ? 'gn-client' : 'gn-project')?.focus();
      return;
    }
    saveRegistration({ version, client: client.trim(), project: project.trim() });
    setStep('done');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      // Clipboard API unavailable (e.g. insecure page): fall back to a hidden textarea.
      const t = document.createElement('textarea');
      t.value = command;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (step === 'done') {
    return (
      <Modal
        onClose={onClose}
        returnFocusTo={returnFocusTo}
        tone="green"
        icon={<CheckIcon />}
        title={`NPM link for v${version}`}
        description={`Registered for ${project.trim()} · ${client.trim()}. Copy the command to install.`}
      >
        <div className="gn-field-label" id="gn-cmd-label">Install command</div>
        <div className="gn-command">
          <code aria-labelledby="gn-cmd-label">{command}</code>
          <button type="button" className="gn-copy" onClick={copy}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <span className="visually-hidden" role="status">{copied ? 'Command copied to clipboard' : ''}</span>
        <div className="gn-actions between">
          <a className="gn-link" href={npmUrl} target="_blank" rel="noreferrer">
            View package on npm <span aria-hidden="true">↗</span>
          </a>
          <button ref={doneButton} type="button" className="gn-btn primary" onClick={onClose}>Done</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      onClose={onClose}
      returnFocusTo={returnFocusTo}
      icon={<BoxIcon />}
      title={`Get NPM for v${version}`}
      description="Tell us where this version will be used. The install link appears after you submit."
    >
      <form onSubmit={submit} noValidate>
        <div className="gn-field">
          <label htmlFor="gn-client" className="gn-field-label">Client name</label>
          <input
            id="gn-client"
            data-autofocus
            className={errors.client ? 'gn-input invalid' : 'gn-input'}
            value={client}
            placeholder="e.g. Acme Health"
            autoComplete="organization"
            aria-invalid={!!errors.client}
            aria-describedby={errors.client ? 'gn-client-err' : undefined}
            onChange={(e) => { setClient(e.target.value); if (errors.client) setErrors({ ...errors, client: undefined }); }}
          />
          {errors.client && <p id="gn-client-err" className="gn-error" role="alert"><AlertIcon /> {errors.client}</p>}
        </div>
        <div className="gn-field">
          <label htmlFor="gn-project" className="gn-field-label">Project name</label>
          <input
            id="gn-project"
            className={errors.project ? 'gn-input invalid' : 'gn-input'}
            value={project}
            placeholder="e.g. Patient Portal"
            aria-invalid={!!errors.project}
            aria-describedby={errors.project ? 'gn-project-err' : undefined}
            onChange={(e) => { setProject(e.target.value); if (errors.project) setErrors({ ...errors, project: undefined }); }}
          />
          {errors.project && <p id="gn-project-err" className="gn-error" role="alert"><AlertIcon /> {errors.project}</p>}
        </div>
        <div className="gn-actions">
          <button type="button" className="gn-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="gn-btn primary">Get link</button>
        </div>
      </form>
    </Modal>
  );
}
