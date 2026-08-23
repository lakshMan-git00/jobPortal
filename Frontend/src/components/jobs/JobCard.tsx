import { Icon } from '../common/Icon';
import { Badge, Button } from '../common/Ui';
import type { Job } from '../../types';

export function JobCard({ job, onOpen }: { job: Job; onOpen: () => void }) {
  return (
    <article className="job-card">
      <div className="company-logo violet">{job.company[0]}</div>
      <div className="job-copy">
        <div className="job-heading">
          <button className="job-link" onClick={onOpen}>
            {job.title}
          </button>
          {job.posted.includes('hour') && <Badge tone="accent">New</Badge>}
        </div>
        <p className="job-company">{job.company}</p>
        <div className="job-meta">
          <span>
            <Icon name="pin" size={15} />
            {job.location}
          </span>
          <span>
            <Icon name="briefcase" size={15} />
            {job.type}
          </span>
          <span>{job.salary ?? 'Not disclosed'}</span>
        </div>
        <div className="tags">
          {job.skills.slice(0, 3).map((skill) => (
            <Badge key={skill}>{skill}</Badge>
          ))}
        </div>
      </div>
      <div className="job-actions">
        <span className="posted">
          <Icon name="clock" size={14} />
          {job.posted}
        </span>
        <Button className="outline-button" onClick={onOpen}>
          View role
        </Button>
      </div>
    </article>
  );
}
