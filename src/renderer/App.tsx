import Accordion from '@mui/material/Accordion';
import AccordionActions from '@mui/material/AccordionActions';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import RemoveIcon from '@mui/icons-material/DeleteOutline';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { IndexableType } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import { db } from './db';
import './App.css';

//
interface TerminalMsgs {
  cmd: string;
  pid: number | null;
  msg: string;
  id?: IndexableType;
  name: string;
  path: string;
}

interface TerminalMsgProp {
  id: number;
  msg: string;
  expanded: boolean;
}

function Hello() {
  const [cmdInput, setCmdInput] = useState({
    name: '',
    cmd: '',
    path: '',
  });
  const [msgs, setMsgs] = useState<TerminalMsgProp[]>([]);
  const [open, setOpen] = React.useState(false);

  const allItems = useLiveQuery(() => db.terminal?.toArray(), []);

  useEffect(() => {
    db.terminal.toArray().then((arr) =>
      arr.forEach((it) => {
        if (it.id) {
          db.terminal.update(it.id, {
            pid: null,
          });
        }
      }),
    );
    const socketInitializer = async () => {
      window.electron.ipcRenderer.on('message', async (data: any) => {
        if (!data || !data.id) {
          return;
        }
        setMsgs([
          ..._.set(msgs, data?.id, {
            id: data?.id,
            msg: (_.get(msgs, data?.id)?.msg || '') + data.msg,
          }),
        ]);
        await db.terminal.update(data.id, {
          pid: data.pid,
          msg: data.msg,
        });
      });
    };
    socketInitializer();
  }, []);

  const onChangeHandler = (e: any) => {
    setCmdInput((prev) => {
      return {
        ...prev,
        [e.target.name]: e.target.value,
      };
    });
  };

  const handleExecute = (m: TerminalMsgs) => {
    window.electron.ipcRenderer.sendMessage('execute-cmd', m);
    if (m.id) {
      db.terminal.update(m.id, {
        msg: '',
      });
    }
  };
  const handleKill = (pid: number | null) => {
    window.electron.ipcRenderer.sendMessage('kill-terminal', pid);
  };

  const handleAdd = async () => {
    const addTerm = {
      pid: null,
      msg: '',
      cmd: cmdInput.cmd,
      name: cmdInput.name,
      path: cmdInput.path,
    };
    await db.terminal.put(addTerm);
    setCmdInput({
      name: '',
      path: '',
      cmd: '',
    });
  };

  const handleDelete = async (m: TerminalMsgs) => {
    if (!m.id) {
      return;
    }
    if (m.pid) {
      setOpen(true);
      handleKill(m.pid);
    }
    await db.terminal.delete(m.id);
  };

  const handleClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === 'clickaway') {
      return;
    }

    setOpen(false);
  };

  return (
    <div>
      <CardContent className="card-content">
        <TextField
          id="name"
          name="name"
          label="Name"
          variant="outlined"
          value={cmdInput.name}
          onChange={(e) => onChangeHandler(e)}
          className="h-12"
        />
        <TextField
          id="path"
          name="path"
          label="Path"
          variant="outlined"
          value={cmdInput.path}
          onChange={(e) => onChangeHandler(e)}
          className="h-12"
        />
        <TextField
          id="cmd"
          name="cmd"
          label="Command"
          variant="outlined"
          value={cmdInput.cmd}
          onChange={(e) => onChangeHandler(e)}
          className="h-12"
        />
        <Button onClick={handleAdd} className="h-14">
          Add
        </Button>
      </CardContent>
      <CardActions />
      <Divider />
      {allItems?.map((m, i) => {
        return (
          <Accordion key={i} classes={{ expanded: 'margin0' }}>
            <div className={`accord-summary-wrapper ${m.pid ? 'running' : ''}`}>
              <RemoveIcon
                style={{ cursor: 'pointer' }}
                onClick={() => handleDelete(m)}
              />
              <AccordionSummary
                aria-controls="panel3-content"
                id="panel3-header"
                classes={{
                  root: 'accord-summary',
                  content: 'summary-content',
                  expanded: 'summary-exp',
                }}
              >
                <p className="">{m.name || m.cmd}</p>
                {m.pid && <p className="pid">pid : {m.pid}</p>}
              </AccordionSummary>
              <AccordionActions>
                <Button
                  sx={{
                    pointerEvents: 'auto',
                  }}
                  disabled={!!m.pid}
                  onClick={() => handleExecute(m)}
                >
                  Run
                </Button>
                <Button
                  sx={{
                    pointerEvents: 'auto',
                  }}
                  disabled={!m.pid}
                  onClick={() => handleKill(m.pid)}
                >
                  Kill
                </Button>
              </AccordionActions>
            </div>
            <AccordionDetails classes={{ root: 'terminal-window' }}>
              <pre className="">
                {msgs?.find((ms) => ms?.id === m?.id)?.msg || ''}
              </pre>
            </AccordionDetails>
          </Accordion>
        );
      })}
      <Snackbar open={open} autoHideDuration={6000} onClose={handleClose}>
        <Alert
          onClose={handleClose}
          severity="warning"
          // variant="filled"
          sx={{ width: '100%' }}
        >
          Process will be terminated
        </Alert>
      </Snackbar>
    </div>
  );
}

export default function App() {
  return <Hello />;
}
