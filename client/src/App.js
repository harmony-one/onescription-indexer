import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
`;

const StyledTable = styled.table`
  margin-top: 20px;
  border-collapse: collapse;
  border: 1px solid black;
`;

const StyledTh = styled.th`
  border: 1px solid black;
  padding: 8px;
  width: 150;

  &:nth-child(3) {
    width: 300px;
  }
`;

const StyledTd = styled.td`
  border: 1px solid black;
  padding: 8px;
  width: 150;

  &:nth-child(3) {
    width: 300px;
  }
`;

const StyledLink = styled.a`
  font-weight: bold;
  color: #00AEE9;
  text-decoration: none;

  &:visited {
    color: #00AEE9;
  }

  &:hover {
    text-decoration: underline;
  }
`;

const fetchInscriptions = async () => {
  const response = await fetch('https://onescription-indexer.fly.dev/inscriptions');
  return response.json();
};

const formatHashAndAddress = (str) => str.slice(0, 6) + '...' + str.slice(-4);

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toISOString().replace('T', ' ').slice(0, 19);
};

function App() {
  const [inscriptions, setInscriptions] = useState([]);

  useEffect(() => {
    fetchInscriptions().then(setInscriptions);
  }, []);

  return (
    <Container>
      <h1>Harmony ONE Inscriptions</h1>
      <StyledTable>
        <thead>
          <tr>
            <StyledTh>Hash</StyledTh>
            <StyledTh>Address</StyledTh>
            <StyledTh>Calldata</StyledTh>
            <StyledTh>Timestamp</StyledTh>
          </tr>
        </thead>
        <tbody>
          {inscriptions.map(inscription => (
            <tr key={inscription.id}>
              <StyledTd>
                <StyledLink href={`https://explorer.harmony.one/tx/${inscription.hash}`} target="_blank" rel="noopener noreferrer">
                  {formatHashAndAddress(inscription.hash)}
                </StyledLink>              
              </StyledTd>
              <StyledTd>{formatHashAndAddress(inscription.address)}</StyledTd>
              <StyledTd>{inscription.calldata}</StyledTd>
              <StyledTd>{formatDate(inscription.timestamp)}</StyledTd>
            </tr>
          ))}
        </tbody>
      </StyledTable>
    </Container>
  );
}

export default App;
