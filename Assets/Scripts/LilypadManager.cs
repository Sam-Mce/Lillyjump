using UnityEngine;
using System.Collections.Generic;

public class LilypadManager : MonoBehaviour
{
    [Header("Lilypad Settings")]
    [SerializeField] private GameObject lilypadPrefab;
    [SerializeField] private float spawnDistance = 20f;
    [SerializeField] private float minLilypadSize = 1f;
    [SerializeField] private float maxLilypadSize = 2f;
    
    [Header("Movement Settings")]
    [SerializeField] private float baseSpeed = 5f;
    [SerializeField] private float speedIncreasePerScore = 0.5f;
    [SerializeField] private float maxSpeed = 15f;
    
    [Header("Spawn Settings")]
    [SerializeField] private int initialLilypads = 5;
    [SerializeField] private float minDistanceBetweenLilypads = 3f;
    [SerializeField] private float maxDistanceBetweenLilypads = 6f;
    
    private List<GameObject> lilypads = new List<GameObject>();
    private float currentSpeed;
    private int score;
    private Transform playerTransform;
    
    private void Start()
    {
        playerTransform = GameObject.FindGameObjectWithTag("Player").transform;
        currentSpeed = baseSpeed;
        SpawnInitialLilypads();
    }
    
    private void Update()
    {
        MoveLilypads();
        CheckAndSpawnNewLilypads();
    }
    
    private void SpawnInitialLilypads()
    {
        Vector3 spawnPosition = transform.position;
        
        for (int i = 0; i < initialLilypads; i++)
        {
            spawnPosition += Vector3.forward * Random.Range(minDistanceBetweenLilypads, maxDistanceBetweenLilypads);
            SpawnLilypad(spawnPosition);
        }
    }
    
    private void SpawnLilypad(Vector3 position)
    {
        float size = Random.Range(minLilypadSize, maxLilypadSize);
        GameObject lilypad = Instantiate(lilypadPrefab, position, Quaternion.identity);
        lilypad.transform.localScale = new Vector3(size, 1f, size);
        lilypads.Add(lilypad);
    }
    
    private void MoveLilypads()
    {
        foreach (GameObject lilypad in lilypads.ToArray())
        {
            if (lilypad != null)
            {
                lilypad.transform.Translate(Vector3.back * currentSpeed * Time.deltaTime);
                
                // Destroy lilypads that are too far behind
                if (lilypad.transform.position.z < playerTransform.position.z - 10f)
                {
                    lilypads.Remove(lilypad);
                    Destroy(lilypad);
                }
            }
        }
    }
    
    private void CheckAndSpawnNewLilypads()
    {
        if (lilypads.Count < initialLilypads)
        {
            Vector3 lastLilypadPos = lilypads[lilypads.Count - 1].transform.position;
            Vector3 spawnPosition = lastLilypadPos + Vector3.forward * Random.Range(minDistanceBetweenLilypads, maxDistanceBetweenLilypads);
            SpawnLilypad(spawnPosition);
        }
    }
    
    public void IncrementScore()
    {
        score++;
        currentSpeed = Mathf.Min(baseSpeed + (score * speedIncreasePerScore), maxSpeed);
    }
    
    public void ResetGame()
    {
        // Clear existing lilypads
        foreach (GameObject lilypad in lilypads)
        {
            if (lilypad != null)
                Destroy(lilypad);
        }
        lilypads.Clear();
        
        // Reset variables
        score = 0;
        currentSpeed = baseSpeed;
        
        // Respawn initial lilypads
        SpawnInitialLilypads();
    }
} 