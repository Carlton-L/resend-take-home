// src/components/DomainError/DomainError.tsx
import type React from 'react';
import { describeDomainInputError } from '@/lib/domain/messages';
import type { DomainInputError } from '@/lib/domain/normalize';

type DomainErrorProps = {
  error: DomainInputError;
  /** Fills the field with a name the user probably meant. Offered only when there is one. */
  onUseSuggestion: (name: string) => void;
};

type MarkedNameProps = {
  name: string;
  labelIndex: number;
};

/**
 * The whole name with the section at fault picked out.
 *
 * Showing the fragment on its own leaves the user matching it back against what they typed, which
 * is the work the interface should be doing.
 */
const MarkedName: React.FC<MarkedNameProps> = ({ name, labelIndex }) => {
  const segments = name.split('.').map((label, index) => ({
    label,
    isMarked: index === labelIndex,
    isFirst: index === 0,
    id: `${index}-${label}`,
  }));

  return (
    <span className='break-all font-mono text-red-800 text-sm'>
      {segments.map((segment) => (
        <span key={segment.id}>
          {segment.isFirst ? null : '.'}
          {segment.isMarked ? (
            <span className='rounded-sm bg-red-200 px-0.5 font-semibold text-red-950'>
              {segment.label}
            </span>
          ) : (
            segment.label
          )}
        </span>
      ))}
    </span>
  );
};

/** Title, the value involved, why, and one next action. Same shape the DNS failures will use. */
const DomainError: React.FC<DomainErrorProps> = ({ error, onUseSuggestion }) => {
  const message = describeDomainInputError(error);
  const { suggestion } = message;

  return (
    <div className='flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-5'>
      <span className='font-medium text-red-900 text-sm'>{message.title}</span>

      {message.subject !== null &&
        (message.subject.kind === 'marked_name' ? (
          <MarkedName name={message.subject.name} labelIndex={message.subject.labelIndex} />
        ) : (
          <span className='break-all font-mono text-red-800 text-sm'>{message.subject.value}</span>
        ))}

      <p className='text-red-800 text-sm leading-relaxed'>{message.description}</p>
      <p className='font-medium text-red-900 text-sm leading-relaxed'>{message.action}</p>

      {suggestion !== null && (
        <button
          type='button'
          onClick={() => onUseSuggestion(suggestion)}
          className='mt-1 w-fit rounded-md border border-red-300 bg-white px-3 py-1.5 font-medium font-mono text-red-900 text-sm transition-colors hover:border-red-400 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-red-900 focus-visible:outline-offset-2'
        >
          Use {suggestion}
        </button>
      )}
    </div>
  );
};

export default DomainError;
